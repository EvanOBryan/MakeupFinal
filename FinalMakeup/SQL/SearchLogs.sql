CREATE TABLE searchlogs (
    id SERIAL PRIMARY KEY,
    search_keyword VARCHAR(255),
    search_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	username VARCHAR(100) NOT NULL
);
