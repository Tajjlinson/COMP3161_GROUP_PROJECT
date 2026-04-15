CREATE TABLE forums (
    forum_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL
);

CREATE TABLE threads (
    thread_id INT AUTO_INCREMENT PRIMARY KEY,
    forum_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_by INT NOT NULL,
    content TEXT NOT NULL
);

CREATE TABLE replies (
    reply_id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    parent_reply_id INT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL
);