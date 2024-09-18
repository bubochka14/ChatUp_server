CREATE DATABASE IF NOT EXISTS chatdb;
use chatdb;
CREATE TABLE IF NOT EXISTS user_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag VARCHAR(255) NOT NULL,
        UNIQUE(tag),
    name VARCHAR(255)
        CHARACTER SET utf8
);
CREATE TABLE IF NOT EXISTS room_info(
    id INT AUTO_INCREMENT PRIMARY KEY ,
    type ENUM('direct','group')
);
CREATE TABLE IF NOT EXISTS user_credentials(
    login VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    userId INT,
    FOREIGN KEY (userId) REFERENCES user_info (id)
         ON DELETE CASCADE
 
);
CREATE TABLE IF NOT EXISTS room_users (
    userId INT,
    roomId INT,
    FOREIGN KEY (roomId) REFERENCES room_info (id)
        ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES user_info (id)
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS group_rooms (
    tag VARCHAR(255) PRIMARY KEY,
    UNIQUE(tag),
    name VARCHAR(255)
        CHARACTER SET utf8,
    roomId INT,
    FOREIGN KEY (roomId) REFERENCES room_info (id)
);
CREATE TABLE IF NOT EXISTS room_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    body VARCHAR(2048)
        CHARACTER SET utf8,
    roomId INT,
    FOREIGN KEY (roomId) REFERENCES room_info (id)
        ON DELETE CASCADE,
    userId INT,
    FOREIGN KEY (userId) REFERENCES user_info (id)
        ON DELETE SET NULL
);