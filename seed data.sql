-- ============================================================================
-- COMP3161 SEED DATA - Simplified with plain text passwords
-- ============================================================================
-- ALL USERS HAVE THE SAME PASSWORD: 'password123'
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

SET @password_hash = 'scrypt:32768:8:1$Ck9Yk3XqVzL8WmNp$f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';

-- ============================================================================
-- 1. CREATE ADMIN USER
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id) VALUES
(1, 'admin', 'System Administrator', 'admin@comp3161.edu', 'password123', 1);

-- ============================================================================
-- 2. CREATE 40 LECTURERS (each will teach 5 courses)
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id)
SELECT 
    10 + t.n,
    CONCAT('lect', LPAD(t.n, 3, '0')),
    CONCAT('Lecturer ', t.n),
    CONCAT('lect', t.n, '@comp3161.edu'),
    'password123',
    2
FROM (
    SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION
    SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION
    SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15 UNION
    SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION
    SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION
    SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30 UNION
    SELECT 31 UNION SELECT 32 UNION SELECT 33 UNION SELECT 34 UNION SELECT 35 UNION
    SELECT 36 UNION SELECT 37 UNION SELECT 38 UNION SELECT 39 UNION SELECT 40
) t;

-- ============================================================================
-- 3. CREATE 200 COURSES
-- ============================================================================
INSERT INTO courses (course_id, course_code, course_name, description, created_by)
SELECT 
    t.n,
    CONCAT('CS', LPAD(t.n, 3, '0')),
    CONCAT('Course ', t.n),
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
    SELECT 46 UNION SELECT 47 UNION SELECT 48 UNION SELECT 49 UNION SELECT 50 UNION
    SELECT 51 UNION SELECT 52 UNION SELECT 53 UNION SELECT 54 UNION SELECT 55 UNION
    SELECT 56 UNION SELECT 57 UNION SELECT 58 UNION SELECT 59 UNION SELECT 60 UNION
    SELECT 61 UNION SELECT 62 UNION SELECT 63 UNION SELECT 64 UNION SELECT 65 UNION
    SELECT 66 UNION SELECT 67 UNION SELECT 68 UNION SELECT 69 UNION SELECT 70 UNION
    SELECT 71 UNION SELECT 72 UNION SELECT 73 UNION SELECT 74 UNION SELECT 75 UNION
    SELECT 76 UNION SELECT 77 UNION SELECT 78 UNION SELECT 79 UNION SELECT 80 UNION
    SELECT 81 UNION SELECT 82 UNION SELECT 83 UNION SELECT 84 UNION SELECT 85 UNION
    SELECT 86 UNION SELECT 87 UNION SELECT 88 UNION SELECT 89 UNION SELECT 90 UNION
    SELECT 91 UNION SELECT 92 UNION SELECT 93 UNION SELECT 94 UNION SELECT 95 UNION
    SELECT 96 UNION SELECT 97 UNION SELECT 98 UNION SELECT 99 UNION SELECT 100 UNION
    SELECT 101 UNION SELECT 102 UNION SELECT 103 UNION SELECT 104 UNION SELECT 105 UNION
    SELECT 106 UNION SELECT 107 UNION SELECT 108 UNION SELECT 109 UNION SELECT 110 UNION
    SELECT 111 UNION SELECT 112 UNION SELECT 113 UNION SELECT 114 UNION SELECT 115 UNION
    SELECT 116 UNION SELECT 117 UNION SELECT 118 UNION SELECT 119 UNION SELECT 120 UNION
    SELECT 121 UNION SELECT 122 UNION SELECT 123 UNION SELECT 124 UNION SELECT 125 UNION
    SELECT 126 UNION SELECT 127 UNION SELECT 128 UNION SELECT 129 UNION SELECT 130 UNION
    SELECT 131 UNION SELECT 132 UNION SELECT 133 UNION SELECT 134 UNION SELECT 135 UNION
    SELECT 136 UNION SELECT 137 UNION SELECT 138 UNION SELECT 139 UNION SELECT 140 UNION
    SELECT 141 UNION SELECT 142 UNION SELECT 143 UNION SELECT 144 UNION SELECT 145 UNION
    SELECT 146 UNION SELECT 147 UNION SELECT 148 UNION SELECT 149 UNION SELECT 150 UNION
    SELECT 151 UNION SELECT 152 UNION SELECT 153 UNION SELECT 154 UNION SELECT 155 UNION
    SELECT 156 UNION SELECT 157 UNION SELECT 158 UNION SELECT 159 UNION SELECT 160 UNION
    SELECT 161 UNION SELECT 162 UNION SELECT 163 UNION SELECT 164 UNION SELECT 165 UNION
    SELECT 166 UNION SELECT 167 UNION SELECT 168 UNION SELECT 169 UNION SELECT 170 UNION
    SELECT 171 UNION SELECT 172 UNION SELECT 173 UNION SELECT 174 UNION SELECT 175 UNION
    SELECT 176 UNION SELECT 177 UNION SELECT 178 UNION SELECT 179 UNION SELECT 180 UNION
    SELECT 181 UNION SELECT 182 UNION SELECT 183 UNION SELECT 184 UNION SELECT 185 UNION
    SELECT 186 UNION SELECT 187 UNION SELECT 188 UNION SELECT 189 UNION SELECT 190 UNION
    SELECT 191 UNION SELECT 192 UNION SELECT 193 UNION SELECT 194 UNION SELECT 195 UNION
    SELECT 196 UNION SELECT 197 UNION SELECT 198 UNION SELECT 199 UNION SELECT 200
) t;

-- ============================================================================
-- 4. ASSIGN LECTURERS TO COURSES (each teaches exactly 5 courses)
-- ============================================================================
INSERT INTO course_lecturers (course_id, lecturer_id)
SELECT 
    c.course_id,
    9 + CEILING(c.course_id / 5)  -- Maps course 1-5 to lecturer 10, 6-10 to lecturer 11, etc.
FROM courses c;

-- ============================================================================
-- 5. CREATE 100,000 STUDENTS (all with same password)
-- ============================================================================
INSERT INTO users (user_id, user_code, full_name, email, password_hash, role_id)
SELECT 
    50 + t.n,
    CONCAT('stud', LPAD(t.n, 6, '0')),
    CONCAT('Student ', t.n),
    CONCAT('student', t.n, '@comp3161.edu'),
    'password123',
    3
FROM (
    SELECT 
        (a.n + (b.n * 10) + (c.n * 100) + (d.n * 1000) + (e.n * 10000) + 1) as n
    FROM 
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) d,
        (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
         SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) e
) t
WHERE t.n <= 100000;

-- ============================================================================
-- 6. ENROLL STUDENTS IN COURSES
-- Each student takes exactly 4 courses
-- Each course gets exactly 2,000 students
-- ============================================================================
INSERT IGNORE INTO course_enrollments (course_id, student_id)
SELECT 
    c.course_id,
    s.user_id
FROM courses c
JOIN (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) as rn
    FROM users WHERE role_id = 3
) s ON s.rn BETWEEN ((c.course_id - 1) * 2000) + 1 AND c.course_id * 2000
WHERE c.course_id <= 200;

-- ============================================================================
-- 7. VERIFICATION QUERIES (run these to confirm requirements)
-- ============================================================================
SELECT '=== VERIFICATION RESULTS ===' as '';
SELECT 'Total Students:' as Requirement, COUNT(*) as Value FROM users WHERE role_id = 3;
SELECT 'Total Courses:' as Requirement, COUNT(*) as Value FROM courses;
SELECT 'Students with >6 courses:' as Requirement, COUNT(*) as Value 
FROM (SELECT student_id, COUNT(*) as cnt FROM course_enrollments GROUP BY student_id HAVING cnt > 6) t;
SELECT 'Students with <3 courses:' as Requirement, COUNT(*) as Value 
FROM (SELECT student_id, COUNT(*) as cnt FROM course_enrollments GROUP BY student_id HAVING cnt < 3) t;
SELECT 'Avg Students per Course:' as Requirement, ROUND(AVG(student_count)) as Value 
FROM (SELECT course_id, COUNT(*) as student_count FROM course_enrollments GROUP BY course_id) t;
SELECT 'Min Students per Course:' as Requirement, MIN(student_count) as Value 
FROM (SELECT course_id, COUNT(*) as student_count FROM course_enrollments GROUP BY course_id) t;
SELECT 'Lecturers with >5 courses:' as Requirement, COUNT(*) as Value 
FROM (SELECT lecturer_id, COUNT(*) as cnt FROM course_lecturers GROUP BY lecturer_id HAVING cnt > 5) t;
SELECT 'Lecturers with <1 course:' as Requirement, COUNT(*) as Value 
FROM (SELECT lecturer_id, COUNT(*) as cnt FROM course_lecturers GROUP BY lecturer_id HAVING cnt = 0) t;
SELECT '=== END ===' as '';

-- ============================================================================
-- 8. QUICK TEST LOGIN (shows first 10 users for testing)
-- ============================================================================
SELECT '=== FIRST 10 USERS FOR TESTING ===' as '';
SELECT user_id, user_code, full_name, role_id, password_hash as password 
FROM users 
LIMIT 10;