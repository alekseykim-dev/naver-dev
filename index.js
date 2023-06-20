const express = require("express");
const mariadb = require("mariadb");
const axios = require("axios");
const request = require("request");

const app = express();
const pool = mariadb.createPool({
  host: "localhost",
  user: "admin",
  password: "tpkris56w",
  database: "dynafit",
  port: "3306",
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

const client_id = "Ly5cZOwWEEa8CD2HstRL";
const client_secret = "1RAG48llzh";
const api_url = "https://openapi.naver.com/v1/datalab/search";

const request_body = {
  startDate: "2016-01-01",
  endDate: "2023-06-19",
  timeUnit: "date",
  keywordGroups: [
    {
      groupName: "한글",
      keywords: ["한글"],
    },
  ],
  device: "",
  ages: ["1"],
  gender: "",
};

app.listen(3000, async () => {
  console.log("Server is running on PORT 3000");

  request.post(
    {
      url: api_url,
      body: JSON.stringify(request_body),
      headers: {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
      },
    },
    async function (error, response, body) {
      if (error) {
        console.error("Error requesting data from API:", error);
        return;
      }

      if (response.statusCode === 200) {
        const responseData = JSON.parse(body);

        // Extract the relevant data from the response
        const keywordGroups = responseData.results;
        const data = {
          startDate: responseData.startDate,
          endDate: responseData.endDate,
          timeUnit: responseData.timeUnit,
          device: "",
          ages: [""],
          gender: "",
        };

        try {
          const conn = await pool.getConnection();

          // Insert data into the 'daily' table for each data point
          const insertQuery =
            "INSERT INTO daily (startDate, endDate, timeUnit, groupName, keywords, data, device, ages, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
          for (const keywordGroup of keywordGroups) {
            for (const { period, ratio } of keywordGroup.data) {
              await conn.query(insertQuery, [
                data.startDate,
                data.endDate,
                data.timeUnit,
                keywordGroup.groupName || "", // Provide an empty string if groupName is undefined or null
                JSON.stringify(keywordGroup.keywords),
                JSON.stringify({ period, ratio }),
                data.device,
                JSON.stringify(data.ages),
                data.gender,
              ]);
            }
          }

          conn.release();
          console.log("Data inserted into the database");
        } catch (error) {
          console.error("Error inserting data into the database:", error);
        }
      } else {
        console.log("API request failed with status code", response.statusCode);
      }
    }
  );
});
