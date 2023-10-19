DROP TABLE IF EXISTS cookie;

CREATE TABLE cookie (
    c_name TEXT NOT NULL,
    count INTEGER
);

INSERT INTO cookie 
(c_name, count)
VALUES
('clicks', 0);
