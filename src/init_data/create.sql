CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    password CHAR(60) NOT NULL,
    info TEXT,
    preferred_platform VARCHAR(20) NOT NULL
);
