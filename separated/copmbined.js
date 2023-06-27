const express = require("express");
const mariadb = require("mariadb");
const axios = require("axios");
const request = require("request");
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

    this.key = "서울";
    this.url = this.baseURL + this.path + `?hintKeywords=${this.key}`;
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
      const device = "";

      try {
        const conn = await this.pool.getConnection();

        const selectQuery = "SELECT period FROM daily";
        const existingData = await conn.query(selectQuery);
        const existingDates = existingData.map((row) => row.period.toISOString().slice(0, 10));

        const insertQuery =
          "INSERT INTO daily (timeUnit, keywords, period, ratio, realNum, insertedDate) VALUES (?, ?, ?, ?, ?, CURDATE())";

        for (const keywordGroup of keywordGroups) {
          for (const { period, ratio } of keywordGroup.data) {
            const currentDate = new Date(period).toISOString().slice(0, 10);

            if (!existingDates.includes(currentDate)) {
              const getRealNumQuery =
                "SELECT realNum FROM ratio_data WHERE period = ? ORDER BY period DESC LIMIT 1";
              const [realNumRow] = await conn.query(getRealNumQuery, [period]);
              const realNum = realNumRow && realNumRow.realNum ? realNumRow.realNum : null;

              try {
                await conn.query(insertQuery, [
                  timeUnit,
                  keywordGroup.keywords, // Insert as string
                  period,
                  ratio,
                  realNum,
                ]);
              } catch (error) {
                if (error.code === "ER_DUP_ENTRY") {
                  console.log(`Skipping duplicate entry for date: ${currentDate}`);
                } else {
                  throw error;
                }
              }
            }
          }
        }

        conn.release();
        console.log("First API Data inserted into the database");
      } catch (error) {
        console.error("Error inserting First API data into the database:", error);
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
            console.error("Error inserting Second API data into the database:", error);
          }
        }
      }

      conn.release();
    } catch (error) {
      console.error("Error requesting API data:", error.response?.data || error.message);
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
