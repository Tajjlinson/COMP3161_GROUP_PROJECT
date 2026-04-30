-- ============================================================================
-- COMP3161 Database Schema - Team Contributions
-- ============================================================================
-- 
-- USER MANAGEMENT & AUTHENTICATION (Shaedane)
--   - users table, roles table
--
-- COURSE MANAGEMENT & ENROLLMENT (Tajaun Tomlinson)  
--   - courses, course_lecturers, course_enrollments
--
-- CALENDAR EVENTS (Htut)
--   - calendar_events
--
-- FORUMS & DISCUSSION (Rommona)
--   - forums, discussion_threads, thread_posts
--
-- CONTENT & ASSIGNMENTS (Yashas)
--   - content_sections, course_contents, assignments, 
--     assignment_submissions, assignment_grades
--
-- INTEGRATION & OPTIMIZATION (ALL)
--   - All indexes, foreign keys, constraints, views
--
-- ============================================================================

CREATE DATABASE IF NOT EXISTS comp3161_db;
USE comp3161_db;

DROP VIEW IF EXISTS v_top_10_students_overall_averages;
DROP VIEW IF EXISTS v_top_10_most_enrolled_courses;
DROP VIEW IF EXISTS v_lecturers_with_3_or_more_courses;
DROP VIEW IF EXISTS v_students_with_5_or_more_courses;
DROP VIEW IF EXISTS v_courses_with_50_or_more_students;

DROP TABLE IF EXISTS assignment_grades;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS course_contents;
DROP TABLE IF EXISTS content_sections;
DROP TABLE IF EXISTS thread_posts;
DROP TABLE IF EXISTS discussion_threads;
DROP TABLE IF EXISTS forums;
DROP TABLE IF EXISTS calendar_events;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS course_lecturers;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
    role_id TINYINT PRIMARY KEY,
    role_name VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id TINYINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT chk_user_code CHECK (CHAR_LENGTH(user_code) >= 4)
);

CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    course_name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_admin FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE course_lecturers (
    course_id INT PRIMARY KEY,
    lecturer_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_lecturers_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_lecturers_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(user_id),
    CONSTRAINT uq_course_lecturer UNIQUE (course_id)
);

CREATE TABLE course_enrollments (
    course_id INT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, student_id),
    CONSTRAINT fk_course_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_enrollments_student FOREIGN KEY (student_id) REFERENCES users(user_id)
);

CREATE TABLE calendar_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_calendar_events_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_events_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE forums (
    forum_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forums_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_forums_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE discussion_threads (
    thread_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forum_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_discussion_threads_forum FOREIGN KEY (forum_id) REFERENCES forums(forum_id) ON DELETE CASCADE,
    CONSTRAINT fk_discussion_threads_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE thread_posts (
    post_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    thread_id BIGINT NOT NULL,
    parent_post_id BIGINT NULL,
    user_id BIGINT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_thread_posts_thread FOREIGN KEY (thread_id) REFERENCES discussion_threads(thread_id) ON DELETE CASCADE,
    CONSTRAINT fk_thread_posts_parent FOREIGN KEY (parent_post_id) REFERENCES thread_posts(post_id) ON DELETE CASCADE,
    CONSTRAINT fk_thread_posts_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE content_sections (
    section_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    position_no INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_content_sections_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT uq_content_section_position UNIQUE (course_id, position_no)
);

CREATE TABLE course_contents (
    content_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    section_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content_type ENUM('link', 'file', 'slide') NOT NULL,
    resource_url VARCHAR(500) NULL,
    file_reference VARCHAR(255) NULL,
    description TEXT,
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_course_contents_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_contents_section FOREIGN KEY (section_id) REFERENCES content_sections(section_id) ON DELETE CASCADE,
    CONSTRAINT fk_course_contents_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

CREATE TABLE assignments (
    assignment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    due_datetime DATETIME NOT NULL,
    max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_creator FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE assignment_submissions (
    submission_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    submission_text TEXT,
    submission_url VARCHAR(500),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_submissions_student FOREIGN KEY (student_id) REFERENCES users(user_id),
    CONSTRAINT uq_assignment_student UNIQUE (assignment_id, student_id)
);

CREATE TABLE assignment_grades (
    grade_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    submission_id BIGINT NOT NULL UNIQUE,
    graded_by BIGINT NOT NULL,
    score DECIMAL(6,2) NOT NULL,
    feedback TEXT,
    graded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_grades_submission FOREIGN KEY (submission_id) REFERENCES assignment_submissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_grades_lecturer FOREIGN KEY (graded_by) REFERENCES users(user_id)
);

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_course_lecturers_lecturer_id ON course_lecturers(lecturer_id);
CREATE INDEX idx_calendar_events_course_start ON calendar_events(course_id, start_datetime);
CREATE INDEX idx_forums_course_id ON forums(course_id);
CREATE INDEX idx_discussion_threads_forum_id ON discussion_threads(forum_id);
CREATE INDEX idx_thread_posts_thread_id ON thread_posts(thread_id);
CREATE INDEX idx_content_sections_course_id ON content_sections(course_id);
CREATE INDEX idx_course_contents_course_section ON course_contents(course_id, section_id);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);

INSERT INTO roles (role_id, role_name) VALUES
    (1, 'admin'),
    (2, 'lecturer'),
    (3, 'student');

CREATE VIEW v_courses_with_50_or_more_students AS
SELECT
    c.course_id,
    c.course_code,
    c.course_name,
    COUNT(ce.student_id) AS student_count
FROM courses c
JOIN course_enrollments ce ON ce.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.course_name
HAVING COUNT(ce.student_id) >= 50;

CREATE VIEW v_students_with_5_or_more_courses AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    COUNT(ce.course_id) AS course_count
FROM users u
JOIN course_enrollments ce ON ce.student_id = u.user_id
WHERE u.role_id = 3
GROUP BY u.user_id, u.user_code, u.full_name
HAVING COUNT(ce.course_id) >= 5;

CREATE VIEW v_lecturers_with_3_or_more_courses AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    COUNT(cl.course_id) AS course_count
FROM users u
JOIN course_lecturers cl ON cl.lecturer_id = u.user_id
WHERE u.role_id = 2
GROUP BY u.user_id, u.user_code, u.full_name
HAVING COUNT(cl.course_id) >= 3;

CREATE VIEW v_top_10_most_enrolled_courses AS
SELECT
    c.course_id,
    c.course_code,
    c.course_name,
    COUNT(ce.student_id) AS student_count
FROM courses c
LEFT JOIN course_enrollments ce ON ce.course_id = c.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY student_count DESC, c.course_name ASC
LIMIT 10;

CREATE VIEW v_top_10_students_overall_averages AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    ROUND(AVG((ag.score / a.max_score) * 100), 2) AS overall_average
FROM users u
JOIN assignment_submissions s ON s.student_id = u.user_id
JOIN assignment_grades ag ON ag.submission_id = s.submission_id
JOIN assignments a ON a.assignment_id = s.assignment_id
WHERE u.role_id = 3
GROUP BY u.user_id, u.user_code, u.full_name
ORDER BY overall_average DESC, u.full_name ASC
LIMIT 10;
