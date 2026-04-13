CREATE DATABASE ourvle;
USE ourvle;
CREATE TABLE course (
     course_id INT AUTO_INCREMENT PRIMARY KEY,
     title VARCHAR(255),
     description TEXT
     );
CREATE TABLE section (
section_id INT AUTO_INCREMENT PRIMARY KEY,
course_id INT NOT NULL,
title VARCHAR(255),
order_no INT,
FOREIGN KEY (course_id) REFERENCES course(course_id)
ON DELETE CASCADE
);

CREATE TABLE section_item (
item_id INT AUTO_INCREMENT PRIMARY KEY,
section_id INT NOT NULL,
type ENUM('link', 'file', 'video') NOT NULL,
title VARCHAR(255),
content TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (section_id) REFERENCES section(section_id)
ON DELETE CASCADE
);

CREATE TABLE assignment (
assignment_id INT AUTO_INCREMENT PRIMARY KEY,
course_id INT NOT NULL,
title VARCHAR(255),
description TEXT,
due_datetime DATETIME,
FOREIGN KEY (course_id) REFERENCES course(course_id)
ON DELETE CASCADE 
);

CREATE TABLE submission (
submission_id INT AUTO_INCREMENT PRIMARY KEY,
assignment_id INT NOT NULL,
student_id INT NOT NULL,
file_url TEXT,
submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
frade DECIMAL(5,2),
FOREIGN KEY (assignment_id) REFERENCES assignment(assignment_id)
ON DELETE CASCADE
);
INSERT INTO course(title, description)
VALUES ('test Course', 'Demo');
ALTER TABLE submission CHANGE COLUMN frade grade INT;