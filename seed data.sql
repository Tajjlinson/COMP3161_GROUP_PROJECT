-- ============================================================================
-- COMP3161 SEED DATA - Satisfies all report requirements
-- ============================================================================
USE comp3161_db;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE assignment_grades;
TRUNCATE assignment_submissions;
TRUNCATE assignments;
TRUNCATE course_contents;
TRUNCATE content_sections;
TRUNCATE thread_posts;
TRUNCATE discussion_threads;
TRUNCATE forums;
TRUNCATE calendar_events;
TRUNCATE course_enrollments;
TRUNCATE course_lecturers;
TRUNCATE courses;
TRUNCATE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. CREATE ADMIN USER
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id) VALUES
(1, 'admin', 'System Administrator', 'admin@comp3161.edu', 'password123', 1);

-- ============================================================================
-- 2. CREATE 20 LECTURERS (each will teach 3-8 courses)
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id)
SELECT
    9 + t.n,
    CONCAT('lect', LPAD(t.n, 2, '0')),
    CONCAT('Lecturer ', t.n),
    CONCAT('lect', t.n, '@comp3161.edu'),
    'password123',
    2
FROM (
    SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) t;

-- ============================================================================
-- 3. CREATE 50 COURSES (varied enrollment potential)
-- ============================================================================
INSERT INTO courses (course_id, course_code, course_name, description, created_by)
SELECT
    t.n,
    CONCAT('CS', LPAD(t.n, 3, '0')),
    CASE
        WHEN t.n <= 15 THEN CONCAT('Popular Course ', t.n)
        WHEN t.n <= 35 THEN CONCAT('Standard Course ', t.n)
        ELSE CONCAT('Elective Course ', t.n)
    END,
    CONCAT('Description for course ', t.n),
    1
FROM (
    SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION
    SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
    SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
    SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION
    SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40 UNION
    SELECT 41 UNION SELECT 42 UNION SELECT 43 UNION SELECT 44 UNION SELECT 45 UNION
    SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50
) t;

-- ============================================================================
-- 4. ASSIGN LECTURERS TO COURSES (ensuring 3+ courses per lecturer)
-- Lecturer 1: courses 1-8 (8 courses)
-- Lecturer 2: courses 9-15 (7 courses)
-- Lecturer 3: courses 16-21 (6 courses)
-- Lecturer 4: courses 22-27 (6 courses)
-- Lecturer 5: courses 28-32 (5 courses)
-- Lecturer 6-19: 3-4 courses each; lecturer 20 owns the final elective
-- ============================================================================
INSERT INTO course_lecturers (course_id, lecturer_id) VALUES
-- Lecturer 10 (8 courses)
(1, 10), (2, 10), (3, 10), (4, 10), (5, 10), (6, 10), (7, 10), (8, 10),
-- Lecturer 11 (7 courses)
(9, 11), (10, 11), (11, 11), (12, 11), (13, 11), (14, 11), (15, 11),
-- Lecturer 12 (6 courses)
(16, 12), (17, 12), (18, 12), (19, 12), (20, 12), (21, 12),
-- Lecturer 13 (6 courses)
(22, 13), (23, 13), (24, 13), (25, 13), (26, 13), (27, 13),
-- Lecturer 14 (5 courses)
(28, 14), (29, 14), (30, 14), (31, 14), (32, 14),
-- Lecturer 15 (4 courses)
(33, 15), (34, 15), (35, 15), (36, 15),
-- Lecturer 16 (4 courses)
(37, 16), (38, 16), (39, 16), (40, 16),
-- Lecturer 17 (3 courses)
(41, 17), (42, 17), (43, 17),
-- Lecturer 18 (3 courses)
(44, 18), (45, 18), (46, 18),
-- Lecturer 19 (3 courses)
(47, 19), (48, 19), (49, 19),
-- Lecturer 20 (1 course)
(50, 20);

-- ============================================================================
-- 5. CREATE 500 STUDENTS (ensuring some take 5+ courses)
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id)
SELECT
    50 + t.n,
    CONCAT('stud', LPAD(t.n, 4, '0')),
    CONCAT('Student ', t.n),
    CONCAT('student', t.n, '@comp3161.edu'),
    'password123',
    3
FROM (
    SELECT
        (a.n + (b.n * 10) + (c.n * 100) + 1) as n
    FROM
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5) c
) t
WHERE t.n <= 500;

-- ============================================================================
-- 6. ENROLL STUDENTS IN COURSES (varied enrollment counts)
-- Goal:
-- - 200 students take 8 courses (5+ requirement satisfied)
-- - 150 students take 6 courses
-- - 100 students take 5 courses
-- - 50 students take 4 courses
-- Each course gets varying student counts (50-200 students)
-- ============================================================================

-- First, create a temporary table for student enrollments
DROP TEMPORARY TABLE IF EXISTS temp_enrollments;
CREATE TEMPORARY TABLE temp_enrollments (
    student_id INT,
    course_id INT,
    UNIQUE KEY unique_enrollment (student_id, course_id)
);

-- Enroll students in popular courses (1-15) - these will have 50+ students
-- Students 1-200 take 8 courses each (popular + standard)
INSERT IGNORE INTO temp_enrollments (student_id, course_id)
SELECT s.user_id, c.course_id
FROM (
    SELECT user_id, @rownum := @rownum + 1 as rn
    FROM users, (SELECT @rownum := 0) r
    WHERE role_id = 3
    LIMIT 200
) s
CROSS JOIN (
    SELECT course_id FROM courses WHERE course_id <= 15
) c
WHERE MOD(s.rn, 15) + 1 <= c.course_id % 15 + 1;

-- Add more courses for these 200 students (to reach 8 total)
INSERT IGNORE INTO temp_enrollments (student_id, course_id)
SELECT s.user_id, c.course_id
FROM (
    SELECT user_id, @rownum := @rownum + 1 as rn
    FROM users, (SELECT @rownum := 0) r
    WHERE role_id = 3
    LIMIT 200
) s
CROSS JOIN (
    SELECT course_id FROM courses WHERE course_id BETWEEN 16 AND 35
) c
WHERE MOD(s.rn, 20) + 1 <= (c.course_id - 15);

-- Students 201-350 take 6 courses each
INSERT IGNORE INTO temp_enrollments (student_id, course_id)
SELECT s.user_id, c.course_id
FROM (
    SELECT user_id, @rownum := @rownum + 1 as rn
    FROM users, (SELECT @rownum := 0) r
    WHERE role_id = 3
    LIMIT 150 OFFSET 200
) s
CROSS JOIN (
    SELECT course_id FROM courses WHERE course_id <= 25
) c
WHERE MOD(s.rn, 25) + 1 <= c.course_id;

-- Students 351-450 take 5 courses each
INSERT IGNORE INTO temp_enrollments (student_id, course_id)
SELECT s.user_id, c.course_id
FROM (
    SELECT user_id, @rownum := @rownum + 1 as rn
    FROM users, (SELECT @rownum := 0) r
    WHERE role_id = 3
    LIMIT 100 OFFSET 350
) s
CROSS JOIN (
    SELECT course_id FROM courses WHERE course_id <= 30
) c
WHERE MOD(s.rn, 30) + 1 <= c.course_id
LIMIT 500;

-- Students 451-500 take 4 courses each
INSERT IGNORE INTO temp_enrollments (student_id, course_id)
SELECT s.user_id, c.course_id
FROM (
    SELECT user_id, @rownum := @rownum + 1 as rn
    FROM users, (SELECT @rownum := 0) r
    WHERE role_id = 3
    LIMIT 50 OFFSET 450
) s
CROSS JOIN (
    SELECT course_id FROM courses WHERE course_id <= 20
) c
WHERE MOD(s.rn, 20) + 1 <= c.course_id
LIMIT 200;

-- Now insert into actual enrollments table
INSERT INTO course_enrollments (course_id, student_id)
SELECT course_id, student_id FROM temp_enrollments;

-- ============================================================================
-- 7. CREATE ASSIGNMENTS AND GRADES (for averages calculation)
-- ============================================================================

-- Add 3 dated assignments per course.
INSERT INTO assignments (assignment_id, course_id, title, description, due_datetime, max_score, created_by)
SELECT
    (@row := @row + 1) as assignment_id,
    c.course_id,
    CONCAT('Assignment ', nums.n, ' for ', c.course_code),
    CONCAT('Seed assignment ', nums.n, ' for ', c.course_name),
    DATE_ADD('2026-02-01 23:59:00', INTERVAL nums.n MONTH),
    100.00,
    cl.lecturer_id
FROM courses c
JOIN course_lecturers cl ON cl.course_id = c.course_id
CROSS JOIN (SELECT 1 as n UNION SELECT 2 UNION SELECT 3) nums
CROSS JOIN (SELECT @row := 0) r;

-- Generate submissions for all enrolled students so grade reports can join through submissions.
INSERT INTO assignment_submissions (submission_id, assignment_id, student_id, submission_text, submitted_at)
SELECT
    (@submission_row := @submission_row + 1),
    a.assignment_id,
    ce.student_id,
    CONCAT('Seed submission from student ', ce.student_id, ' for assignment ', a.assignment_id),
    DATE_SUB(a.due_datetime, INTERVAL 2 DAY)
FROM assignments a
JOIN course_enrollments ce ON a.course_id = ce.course_id
CROSS JOIN (SELECT @submission_row := 0) r;

-- Generate grades for all submissions (biased to create top students for the top-10 average report).
INSERT INTO assignment_grades (grade_id, submission_id, graded_by, score, feedback, graded_at)
SELECT
    (@grade_row := @grade_row + 1),
    s.submission_id,
    a.created_by,
    -- Create grade distribution: some top students get high grades
    CASE
        -- Top 20 students (by ID) get 90-100%
        WHEN s.student_id <= 70 THEN 90 + FLOOR(RAND() * 11)
        -- Next 50 students get 80-95%
        WHEN s.student_id <= 120 THEN 80 + FLOOR(RAND() * 16)
        -- Good students get 75-90%
        WHEN s.student_id <= 200 THEN 75 + FLOOR(RAND() * 16)
        -- Average students get 65-85%
        WHEN s.student_id <= 350 THEN 65 + FLOOR(RAND() * 21)
        -- Below average get 50-75%
        ELSE 50 + FLOOR(RAND() * 26)
    END as score,
    'Seed grade for report testing',
    DATE_SUB(a.due_datetime, INTERVAL 1 DAY)
FROM assignment_submissions s
JOIN assignments a ON a.assignment_id = s.assignment_id
CROSS JOIN (SELECT @grade_row := 0) r;

-- ============================================================================
-- 8. CREATE REQUIRED VIEWS
-- ============================================================================

-- View 1: All courses that have 50 or more students
CREATE OR REPLACE VIEW courses_with_50_plus_students AS
SELECT
    c.course_id,
    c.course_code,
    c.course_name,
    COUNT(ce.student_id) as enrolled_students
FROM courses c
JOIN course_enrollments ce ON c.course_id = ce.course_id
GROUP BY c.course_id, c.course_code, c.course_name
HAVING COUNT(ce.student_id) >= 50
ORDER BY enrolled_students DESC;

-- View 2: All students that do 5 or more courses
CREATE OR REPLACE VIEW students_with_5_plus_courses AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    COUNT(ce.course_id) as courses_enrolled
FROM users u
JOIN course_enrollments ce ON u.user_id = ce.student_id
WHERE u.role_id = 3
GROUP BY u.user_id, u.user_code, u.full_name
HAVING COUNT(ce.course_id) >= 5
ORDER BY courses_enrolled DESC;

-- View 3: All lecturers that teach 3 or more courses
CREATE OR REPLACE VIEW lecturers_with_3_plus_courses AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    COUNT(cl.course_id) as courses_taught
FROM users u
JOIN course_lecturers cl ON u.user_id = cl.lecturer_id
WHERE u.role_id = 2
GROUP BY u.user_id, u.user_code, u.full_name
HAVING COUNT(cl.course_id) >= 3
ORDER BY courses_taught DESC;

-- View 4: The 10 most enrolled courses
CREATE OR REPLACE VIEW top_10_most_enrolled_courses AS
SELECT
    c.course_id,
    c.course_code,
    c.course_name,
    COUNT(ce.student_id) as enrolled_students
FROM courses c
JOIN course_enrollments ce ON c.course_id = ce.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY enrolled_students DESC
LIMIT 10;

-- View 5: Top 10 students with highest overall averages
CREATE OR REPLACE VIEW top_10_students_by_average AS
SELECT
    u.user_id,
    u.user_code,
    u.full_name,
    ROUND(AVG(ag.score), 2) as overall_average,
    COUNT(DISTINCT a.course_id) as courses_taken,
    COUNT(ag.grade_id) as total_grades
FROM users u
JOIN assignment_submissions s ON s.student_id = u.user_id
JOIN assignment_grades ag ON ag.submission_id = s.submission_id
JOIN assignments a ON a.assignment_id = s.assignment_id
WHERE u.role_id = 3
GROUP BY u.user_id, u.user_code, u.full_name
HAVING COUNT(DISTINCT a.course_id) >= 3  -- Ensure meaningful average
ORDER BY overall_average DESC
LIMIT 10;

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================
SELECT '=== VERIFICATION OF REQUIREMENTS ===' as '';
SELECT '1. Courses with 50+ students:' as Requirement, COUNT(*) as Count FROM courses_with_50_plus_students;
SELECT '2. Students with 5+ courses:' as Requirement, COUNT(*) as Count FROM students_with_5_plus_courses;
SELECT '3. Lecturers with 3+ courses:' as Requirement, COUNT(*) as Count FROM lecturers_with_3_plus_courses;
SELECT '4. Top 10 most enrolled courses (showing enrollment counts):' as '';
SELECT course_code, enrolled_students FROM top_10_most_enrolled_courses;
SELECT '5. Top 10 students by average (showing averages):' as '';
SELECT user_code, overall_average, courses_taken FROM top_10_students_by_average;
SELECT '=== END VERIFICATION ===' as '';

-- ============================================================================
-- 10. DISPLAY SAMPLE DATA FOR TESTING
-- ============================================================================
SELECT '=== SAMPLE STUDENT ENROLLMENT COUNTS ===' as '';
SELECT
    u.user_code,
    COUNT(ce.course_id) as courses_enrolled
FROM users u
JOIN course_enrollments ce ON u.user_id = ce.student_id
WHERE u.role_id = 3
GROUP BY u.user_id, u.user_code
ORDER BY courses_enrolled DESC
LIMIT 20;

SELECT '=== SAMPLE COURSE ENROLLMENT COUNTS ===' as '';
SELECT
    c.course_code,
    c.course_name,
    COUNT(ce.student_id) as enrolled_students
FROM courses c
LEFT JOIN course_enrollments ce ON c.course_id = ce.course_id
GROUP BY c.course_id, c.course_code, c.course_name
ORDER BY enrolled_students DESC
LIMIT 15;
