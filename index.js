const express = require("express");
require('dotenv').config();
const mariadb = require("mariadb");
const axios = require("axios");
const request = require("request");

const app = express();
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

pool
  .getConnection()
  .then((connection) => {
    if (connection) {
      console.log("Connected to the database");
      connection.release(); // Release the connection after checking
    }
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const api_url = "https://openapi.naver.com/v1/datalab/search";

const request_body = {
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

// ...

app.listen(3000, async () => {
  console.log("Server is running on PORT 3000");

  try {
    const { data } = await axios.post(api_url, request_body, {
      headers: {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
      },
    });

    const keywordGroups = data.results;
    const timeUnit = data.timeUnit;
    const device = "";

    try {
      const conn = await pool.getConnection();

      const selectQuery = "SELECT period FROM daily";
      const existingData = await conn.query(selectQuery);
      const existingDates = existingData.map((row) => row.period.toISOString().slice(0, 10));

      const insertQuery =
        "INSERT INTO daily (timeUnit, keywords, period, ratio, realNum, insertedDate) VALUES (?, ?, ?, ?, ?, CURDATE())";
      
      for (const keywordGroup of keywordGroups) {
        for (const { period, ratio } of keywordGroup.data) {
          const currentDate = new Date(period).toISOString().slice(0, 10);

          if (!existingDates.includes(currentDate)) {
            const getRealNumQuery = "SELECT realNum FROM ratio_data WHERE period = ? ORDER BY period DESC LIMIT 1";
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
      console.log("Data inserted into the database");
    } catch (error) {
      console.error("Error inserting data into the database:", error);
    }
  } catch (error) {
    console.error("Error requesting data from API:", error.response?.data || error.message);
  }
});
