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
CREATE TABLE IF NOT EXISTS user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'lecturer', 'student') NOT NULL,
    full_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id)
    );
CREATE TABLE IF NOT EXISTS course_lecturer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES user(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_course_lecturer (course_id)  -- Only one lecturer per course
);

ALTER TABLE submission CHANGE COLUMN frade grade DECIMAL(5,2);
DESCRIBE submission;
ALTER TABLE submission MODIFY COLUMN grade DECIMAL(5,2);
DESCRIBE submission;
INSERT INTO user (username, email, password, role, full_name) VALUES
('john_doe', 'john@test.com', 'pass123', 'student', 'John Doe'),
('jane_smith', 'jane@test.com', 'pass123', 'student', 'Jane Smith'),
('bob_wilson', 'bob@test.com', 'pass123', 'student', 'Bob Wilson'),
('prof_lee', 'lee@test.com', 'pass123', 'lecturer', 'Prof. Lee'),
('prof_chen', 'chen@test.com', 'pass123', 'lecturer', 'Prof. Chen');

-- Insert more courses
INSERT INTO course(title, description) VALUES 
('Database Design', 'Learn SQL and database design'),
('Web Development', 'HTML, CSS, JavaScript, Flask'),
('Data Structures', 'Algorithms and data structures');

INSERT INTO enrollment (student_id, course_id) VALUES 
(1, 1), (1, 2), (1, 3),  -- John in 3 courses
(2, 1), (2, 2),           -- Jane in 2 courses
(3, 1);                     -- Bob in 1 course

INSERT INTO course_lecturer (lecturer_id, course_id) VALUES 
(4, 1),  -- Prof. Lee teaches Database Design
(4, 2);  -- Prof. Lee teaches Web Development
