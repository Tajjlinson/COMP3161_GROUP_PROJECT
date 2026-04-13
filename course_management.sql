-- ============================================
--  COMP3161 - Course Management & Enrollment
--  Person 2 Schema
-- ============================================

CREATE TABLE IF NOT EXISTS courses (
    course_id        INT AUTO_INCREMENT PRIMARY KEY,
    course_name      VARCHAR(255) NOT NULL,
    created_by_admin INT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_lecturers (
    course_id   INT NOT NULL UNIQUE,  -- enforces one lecturer per course
    lecturer_id INT NOT NULL,
    PRIMARY KEY (course_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id     INT NOT NULL,
    student_id    INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Sample seed data for Postman testing
-- ─────────────────────────────────────────────

INSERT INTO courses (course_name, created_by_admin) VALUES
    ('Database Systems', 1),
    ('Object-Oriented Design', 1),
    ('Computer Systems Organization', 2);

INSERT INTO course_lecturers (course_id, lecturer_id) VALUES
    (1, 10),
    (2, 11),
    (3, 10);

INSERT INTO course_enrollments (course_id, student_id) VALUES
    (1, 100),
    (1, 101),
    (2, 100);