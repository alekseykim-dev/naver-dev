-- CREATE TABLE daily (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   startDate DATE NOT NULL,
--   endDate DATE NOT NULL,
--   timeUnit VARCHAR(10) NOT NULL,
--   keywordGroups TEXT NOT NULL,
--   device VARCHAR(10) NOT NULL,
--   ages TEXT NOT NULL,
--   gender VARCHAR(1) NOT NULL
-- );

-- ALTER TABLE daily MODIFY COLUMN keywordGroups LONGTEXT;
-- ALTER TABLE daily MODIFY COLUMN data MEDIUMTEXT NOT NULL;





  -- alter table daily add realNum VARCHAR(10) NOT NULL


-- CREATE TABLE daily (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   timeUnit VARCHAR(10) NOT NULL,
--   groupName VARCHAR(255) NOT NULL,
--   keywords TEXT NOT NULL,
--   period DATE,
--   ratio DECIMAL(10, 5)
-- );


/**********************************************************************************/

CREATE TABLE IF NOT EXISTS daily (
  timeUnit VARCHAR(10) NOT NULL,
  keywords TEXT NOT NULL,
  period DATE NOT NULL,
  ratio VARCHAR(10) NOT NULL,
  realNum DECIMAL(10, 2),
  insertedDate DATE NOT NULL,
  PRIMARY KEY (period)
);

/**********************************************************************************/

CREATE TABLE IF NOT EXISTS 30days (
  timeUnit VARCHAR(10) NOT NULL,
  relKeyword VARCHAR(255) NOT NULL,
  period DATE NOT NULL,
  monthlyPcQcCnt VARCHAR(10) NOT NULL,
  monthlyMobileQcCnt VARCHAR(10) NOT NULL,
  monthlyTotalQcCnt INT,
  insertedDate DATE NOT NULL,
  UNIQUE KEY unique_keyword_period (relKeyword, period)
);

/**********************************************************************************/


CREATE TABLE IF NOT EXISTS keywords_table (
  keyword VARCHAR(255) UNIQUE,
  status VARCHAR(255),
  reg_date DATE,
  update_date VARCHAR(10)
);

UPDATE keywords_table
SET update_date = CURDATE()
WHERE keyword IN (
  SELECT relKeyword
  FROM 30days
  WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
)
AND keyword IN (
  SELECT keywords
  FROM daily
  WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
);

UPDATE keywords_table
SET status = 'A'
WHERE update_date = CURDATE();

-- Update the status column from "R" to "A" based on the active_date value







-- CREATE TABLE IF NOT EXISTS keywords_table (
--   keyword VARCHAR(255) UNIQUE,
--   status VARCHAR(255),
--   reg_date DATE,
  
-- );

-- -- Add a new column to keywords_table
-- ALTER TABLE keywords_table
-- ADD COLUMN active_date DATE;


-- ALTER TABLE keywords_table
-- MODIFY active_date VARCHAR(10);

-- -- Update the active_date column based on conditions
-- UPDATE keywords_table
-- SET active_date = CURDATE()
-- WHERE keyword IN (
--   SELECT relKeyword
--   FROM 30days
--   WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
-- )
-- AND keyword IN (
--   SELECT keywords
--   FROM daily
--   WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
-- );

-- -- Update the status column from "R" to "A" based on the active_date value
-- UPDATE keywords_table
-- SET status = 'A'
-- WHERE active_date = CURDATE();



-- -- Modify the active_date column to VARCHAR(10) and set default value to 'N/A'
-- ALTER TABLE keywords_table
-- MODIFY active_date VARCHAR(10) DEFAULT 'N/A';

-- -- Update the active_date column and status column based on conditions
-- UPDATE keywords_table
-- SET
--   active_date = IF(
--     keyword IN (
--       SELECT relKeyword
--       FROM 30days
--       WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
--     )
--     AND keyword IN (
--       SELECT keywords
--       FROM daily
--       WHERE period = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
--     ),
--     CURDATE(),
--     active_date
--   ),
--   status = IF(active_date = CURDATE(), 'A', status);

/**********************************************************************************/


CREATE TABLE IF NOT EXISTS ratio_data (
  period DATE NOT NULL,
  ratio DECIMAL(18, 6),
  realNum DECIMAL(10, 2),
  insertedDate DATE
);



