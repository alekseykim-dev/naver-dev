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

CREATE TABLE daily (
  timeUnit VARCHAR(10) NOT NULL,
  keywords TEXT NOT NULL,
  period DATE NOT NULL,
  ratio VARCHAR(10) NOT NULL,
  insertedDate DATE NOT NULL
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

