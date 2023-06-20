const express = require('express');
const mariadb = require('mariadb');
const request = require('request');
const axios = require('axios');


const app = express();
const pool = mariadb.createPool({
  host: 'localhost', 
  user: 'admin', 
  password: 'tpkris56w',
  database: 'dynafit' ,
  port: '3306'
});

pool.getConnection()
  .then(connection => {
    if (connection) {
      console.log('Connected to the database');
      // Perform further database operations here
    }
  })
  .catch(error => {
    console.error('Error connecting to the database:', error);
  });

const client_id = '010000000015943d449f90b5be258cb060a410e7a8ce075c433ea38d9f028cf5b661000087';
const client_secret = 'AQAAAAAVlD1En5C1viWMsGCkEOeoTGUuFJeCD5SXhibYaAtWdA==';
const api_url = 'https://openapi.naver.com/v1/datalab/search';

app.use(express.json());

app.post('/daily', async (req, res) => {
  try {
    const { startDate, endDate, timeUnit, keywordGroups, device, ages, gender } = req.body;

    const conn = await pool.getConnection();

    // Вставка нового pull request в базу данных
    const insertQuery = `INSERT INTO pull_requests (startDate, endDate, timeUnit, keywordGroups, device, ages, gender) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await conn.query(insertQuery, [startDate, endDate, timeUnit, JSON.stringify(keywordGroups), device, JSON.stringify(ages), gender]);

    conn.release();

    const request_body = {
        "startDate": "2016-01-01",
        "endDate": "2023-06-19",
        "timeUnit": "date",
        "keywordGroups": [
            {
                "groupName": "한글",
                "keywords": [
                    "한글",
                    "korean"
                ]
            },
        ],
        "device": "",
        "ages": [
        ],
        "gender": ""
    };
    

    request.post({
      url: api_url,
      body: JSON.stringify(request_body),
      headers: {
        'X-Naver-Client-Id': client_id,
        'X-Naver-Client-Secret': client_secret,
        'Content-Type': 'application/json'
      }
    },
    function (error, response, body) {
      console.log(response.statusCode);
      console.log(body);
      res.status(response.statusCode).json(body);
    });
  } catch (error) {
    console.error('pull request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, () => {
  console.log('SErver is running on PORT 3000');
});
