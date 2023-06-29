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

CREATE TABLE IF NOT EXISTS daily (
  timeUnit VARCHAR(10) NOT NULL,
  keywords TEXT NOT NULL,
  period DATE NOT NULL,
  ratio VARCHAR(10) NOT NULL,
  realNum DECIMAL(10, 2),
  insertedDate DATE NOT NULL,
  PRIMARY KEY (period)
);




  -- alter table daily add realNum VARCHAR(10) NOT NULL


-- CREATE TABLE daily (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   timeUnit VARCHAR(10) NOT NULL,
--   groupName VARCHAR(255) NOT NULL,
--   keywords TEXT NOT NULL,
--   period DATE,
--   ratio DECIMAL(10, 5)
-- );





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

--ALTER TABLE 30days ADD COLUMN monthlyTotalQcCnt INT;



CREATE TABLE IF NOT EXISTS keywords_table (
  keyword VARCHAR(255) UNIQUE,
  status VARCHAR(255),
  reg_date DATE
);





CREATE TABLE IF NOT EXISTS ratio_data (
  period DATE NOT NULL,
  ratio DECIMAL(18, 6),
  realNum DECIMAL(10, 2),
  insertedDate DATE
);



