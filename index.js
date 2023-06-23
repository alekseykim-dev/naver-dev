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

const client_id = "ydW3Klw44WWR61PEHJCY";
const client_secret = "GtmR8inH9d";
const api_url = "https://openapi.naver.com/v1/datalab/search";

const request_body = {
  startDate: "2016-01-01",
  endDate: "2023-06-22",
  timeUnit: "date",
  keywordGroups: [
    {
      groupName: "한글",
      keywords: ["서울"],
    },
  ],
  device: "",
  ages: ["1"],
  gender: "",
}; 

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

      // const insertQuery =
      // "INSERT INTO daily (timeUnit, keywords, period, ratio, insertedDate) VALUES (?, ?, ?, ?, CURDATE())";
  
      // for (const keywordGroup of keywordGroups) {
      //   for (const { period, ratio } of keywordGroup.data) {
      //     await conn.query(insertQuery, [
      //       timeUnit,
      //       keywordGroup.keywords, 
      //       period,
      //       ratio
      //     ]);
      //   }
      // }

      const insertQuery =
        "INSERT INTO daily (timeUnit, keywords, period, ratio, insertedDate) VALUES (?, ?, ?, ?, CURDATE())";
      for (const keywordGroup of keywordGroups) {
        for (const { period, ratio } of keywordGroup.data) {
          await conn.query(insertQuery, [
            timeUnit,
            keywordGroup.keywords, // Insert as string
            period,
            ratio,
          ]);
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
