USE comp3161_db;

SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS courses_count FROM courses;
SELECT COUNT(*) AS submissions_count FROM assignment_submissions;
SELECT COUNT(*) AS grades_count FROM assignment_grades;

SELECT lecturer_id, COUNT(*) AS course_count
FROM course_lecturers
GROUP BY lecturer_id
HAVING COUNT(*) >= 3;
