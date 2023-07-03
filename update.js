const express = require("express");
const mariadb = require("mariadb");
const axios = require("axios");
const CryptoJS = require("crypto-js");

require("dotenv").config();

class MyApp {
  constructor() {
    this.app = express();
    this.pool = mariadb.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
    });

    // First API configuration
    this.client_id = process.env.CLIENT_ID;
    this.client_secret = process.env.CLIENT_SECRET;
    this.api_url = "https://openapi.naver.com/v1/datalab/search";

    this.request_body = {
      startDate: "2016-01-01",
      endDate: new Date().toISOString().slice(0, 10),
      timeUnit: "date",
      keywordGroups: [
        {
          groupName: "한글",
          keywords: ["서울"],
        },
      ],
    };

    // Second API configuration
    this.baseURL = "https://api.searchad.naver.com";
    this.path = "/keywordstool";
    this.apiKey = process.env.API_KEY;
    this.secretKey = process.env.SECRET_KEY;
    this.customerId = process.env.CUSTOMER_ID;

    this.timestamp = Date.now().toString();
    this.method = "GET";
    this.sign = `${this.timestamp}.${this.method}.${this.path}`;
    this.signature = CryptoJS.enc.Base64.stringify(
      CryptoJS.HmacSHA256(this.sign, this.secretKey)
    );

    this.headers = {
      "X-API-KEY": this.apiKey,
      "X-Customer": this.customerId,
      "X-Timestamp": this.timestamp,
      "X-Signature": this.signature,
    };

    this.key = this.request_body.keywordGroups[0].keywords[0];
    this.url = this.baseURL + this.path + `?hintKeywords=${encodeURIComponent(this.key)}`;
  }

  async connectToDatabase() {
    try {
      const connection = await this.pool.getConnection();
      if (connection) {
        console.log("Connected to the database");
        connection.release(); // Release the connection after checking
      }
    } catch (error) {
      console.error("Error connecting to the database:", error);
    }
  }

  async fetchDataAndInsertIntoDatabase() {
    try {
      // First API request
      const { data } = await axios.post(this.api_url, this.request_body, {
        headers: {
          "X-Naver-Client-Id": this.client_id,
          "X-Naver-Client-Secret": this.client_secret,
          "Content-Type": "application/json",
        },
      });

      const keywordGroups = data.results;
      const timeUnit = data.timeUnit;

      try {
        const conn = await this.pool.getConnection();

        // Retrieve keywords from keywordGroups and insert into keywords_table
        const insertKeywordsQuery =
          "INSERT IGNORE INTO keywords_table (keyword, status, reg_date) VALUES (?, 'R', CURDATE())";

        for (const keywordGroup of keywordGroups) {
          const { keywords } = keywordGroup;
          for (const keyword of keywords) {
            try {
              const insertResult = await conn.query(insertKeywordsQuery, [
                keyword,
              ]);
              if (insertResult.affectedRows === 1) {
                console.log(
                  `Keyword '${keyword}' inserted into the 'keywords_table'`
                );
              } else {
                console.log(`Skipping duplicate entry for keyword: ${keyword}`);
              }
            } catch (error) {
              throw error;
            }
          }
        }

        const selectQuery = "SELECT period FROM daily";
        const existingData = await conn.query(selectQuery);
        const existingDates = existingData.map((row) =>
          row.period.toISOString().slice(0, 10)
        );
        const selectKeywordQuery = "SELECT keyword FROM keywords_table LIMIT 1";
        const [keywordRow] = await conn.query(selectKeywordQuery);
        const keyword = keywordRow?.keyword || ""; // Set a default value if no keyword is found
        console.log("keyword: ", keyword);

        const insertQuery =
          "INSERT INTO daily (timeUnit, keywords, period, ratio, realNum, insertedDate) VALUES (?, ?, ?, ?, ?, CURDATE())";

        for (const keywordGroup of keywordGroups) {
          for (const { period, ratio } of keywordGroup.data) {
            const currentDate = new Date(period).toISOString().slice(0, 10);

            if (!existingDates.includes(currentDate)) {
              const getRealNumQuery =
                "SELECT realNum FROM ratio_data WHERE period = ? ORDER BY period DESC LIMIT 1";
              const [realNumRow] = await conn.query(getRealNumQuery, [period]);
              let realNum =
                realNumRow && realNumRow.realNum ? realNumRow.realNum : null;

              // New feature: Process null rows
              if (realNum === null) {
                const getPrevRealNumsQuery =
                  "SELECT realNum FROM daily WHERE realNum IS NOT NULL ORDER BY period DESC LIMIT 29";
                const prevRealNumRows = await conn.query(getPrevRealNumsQuery, [
                  period,
                ]);
                console.log("prevRealNumRows:", prevRealNumRows);
                const prevRealNums = Array.isArray(prevRealNumRows)
                  ? prevRealNumRows.map((row) => Number(row.realNum))
                  : [];
                const sumPrevRealNums = prevRealNums.reduce(
                  (sum, prevRealNum) => sum + prevRealNum,
                  0
                );

                console.log("sumPrevRealNums:", sumPrevRealNums);
                const getLatestMonthlyTotalQcCntQuery =
                  "SELECT monthlyTotalQcCnt FROM 30days ORDER BY period DESC LIMIT 1";
                const [latestMonthlyTotalQcCntRow] = await conn.query(
                  getLatestMonthlyTotalQcCntQuery
                );
                const latestMonthlyTotalQcCnt =
                  latestMonthlyTotalQcCntRow?.monthlyTotalQcCnt || 0;
                  console.log('latestMonthlyTotalQcCnt:', latestMonthlyTotalQcCnt)

                realNum = latestMonthlyTotalQcCnt - sumPrevRealNums;
                console.log("realNum:", realNum);
              }

              try {
                await conn.query(insertQuery, [
                  timeUnit,
                  keywordGroup.keywords, // Insert as string
                  period,
                  ratio,
                  realNum,
                ]);
                console.log(
                  `Data inserted for keyword '${keyword}' and period '${currentDate}'`
                );
              } catch (error) {
                if (error.code === "ER_DUP_ENTRY") {
                  console.log(
                    `Skipping duplicate entry for date: ${currentDate}`
                  );
                } else {
                  throw error;
                }
              }
            }
          }
        }

        conn.release();
        console.log("First API Data inserted into the database");
        console.log("Keywords inserted into the 'keywords_table'");
      } catch (error) {
        console.error("Error inserting data into the database:", error);
      }

      // Second API request
      const response = await axios.get(this.url, { headers: this.headers });
      const keywordList = response.data.keywordList;
      console.log("Second API Keyword List:", keywordList);
      console.log("Second API Keyword List Type:", typeof keywordList);

      const conn = await this.pool.getConnection();

      const insertQuery =
        "INSERT INTO 30days (timeUnit, relKeyword, period, monthlyPcQcCnt, monthlyMobileQcCnt, monthlyTotalQcCnt, insertedDate) VALUES (?, ?, ?, ?, ?, ?, CURDATE())";

      for (const keyword of keywordList) {
        const { relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt } = keyword;
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 1);
        const period = currentDate.toISOString().slice(0, 10);
        const monthlyTotalQcCnt = monthlyPcQcCnt + monthlyMobileQcCnt;

        console.log("Second API monthlyTotalQcCnt: ", monthlyTotalQcCnt);

        try {
          await conn.query(insertQuery, [
            "monthly",
            relKeyword,
            period,
            monthlyPcQcCnt,
            monthlyMobileQcCnt,
            monthlyTotalQcCnt,
          ]);
          console.log("Second API Data inserted into the database");
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") {
            console.log(
              `Duplicate entry for keyword '${relKeyword}' and period '${period}'. Skipping insertion.`
            );
          } else {
            console.error(
              "Error inserting Second API data into the database:",
              error
            );
          }
        }
      }

      // Modify the keywords_table to add the update_date column
      const addActiveDateColumnQuery = "ALTER TABLE keywords_table MODIFY update_date VARCHAR(10) DEFAULT 'N/A'";
await conn.query(addActiveDateColumnQuery);

const updateActiveDateQuery = `
  UPDATE keywords_table
  SET
  update_date = IF(
      keyword IN (
        SELECT relKeyword
        FROM 30days
        WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      )
      AND keyword IN (
        SELECT keywords
        FROM daily
        WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
      ),
      CURDATE(),
      update_date
    ),
    status = IF(update_date = CURDATE(), 'A', status)
`;
await conn.query(updateActiveDateQuery);


      console.log("Keyword status updated to 'A'");

      conn.release();
    } catch (error) {
      console.error(
        "Error requesting API data:",
        error.response?.data || error.message
      );
    }
  }

  startServer() {
    this.app.listen(3000, async () => {
      console.log("Server is running on PORT 3000");
      await this.fetchDataAndInsertIntoDatabase();
    });
  }

  async start() {
    try {
      await this.connectToDatabase();
      this.startServer();
    } catch (error) {
      console.error("Error:", error);
    }
  }
}

const myApp = new MyApp();
myApp.start();



// now, add a feature so that the 'update_date'  in keywords_table is updated to current_date if the 'status'  is 'A'. if the status is not 'A', 