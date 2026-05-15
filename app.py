from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error
app = Flask(__name__)

# Database connection function
db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Raoul@123",  # Your password
            database="ourvle"  # Your database name
        )


    
def get_cursor():
    return db.cursor(dictionary=True)


#''''''''''''''COURSE CONTENT ENDPOINTS''''''''''''

#Add section(Lecturer)

@app.route('/sections', methods=['POST'])
def create_section():
    data = request.json
    cursor = get_cursor()

    query = "INSERT INTO section (course_id, title, order_no) VALUES (%s, %s, %s)"
    cursor.execute(query, (data['course_id'], data['title'], data['order_no']))
    db.commit()

    return jsonify({"message": "Section created"})

#Add Section Item

@app.route('/section-items', methods=['POST'])
def add_section_item():
    data = request.json
    cursor = get_cursor()

    query = """
        INSERT INTO section_item (section_id, type, title, content)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (
        data['section_id'],
        data['type'],
        data['title'],
        data['content']
    ))
    db.commit()

    return jsonify({"message": "Content added"})

#Get Course Content

@app.route('/courses/<int:course_id>/content', methods=['GET'])
def get_course_content(course_id):
    cursor = get_cursor()

    query = """
    SELECT s.section_id, s.title AS section_title,
           i.item_id, i.title, i.type, i.content
    FROM section s
    LEFT JOIN section_item i ON s.section_id = i.section_id
    WHERE s.course_id = %s
    ORDER BY s.order_no
    """
    cursor.execute(query, (course_id,))
    data = cursor.fetchall()

    return jsonify(data)


#''''''''''ASSIGNMENT ENDPOINTS''''''''''''
#create assignment

@app.route('/assignments', methods=['POST'])
def create_assignment():
    data = request.json
    cursor = get_cursor()

    query = """
    INSERT INTO assignment (course_id, title, description, due_datetime)
    VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (
        data['course_id'],
        data['title'],
        data['description'],
        data['due_datetime']
    ))
    db.commit()

    return jsonify({"message": "Assignment created"})

#Get Assignments for course
@app.route('/courses/<int:course_id>/assignments', methods=['GET'])
def get_assignments(course_id):
    cursor = get_cursor()

    query = "SELECT * FROM assignment WHERE course_id = %s"
    cursor.execute(query, (course_id,))
    data = cursor.fetchall()

    return jsonify(data)


#''''''''''SUBMISSION ENDPOINTS''''''''''''

#Submit Assignments
@app.route('/submissions', methods=['POST'])
def submit_assignment():
    data = request.json
    cursor = get_cursor()

    query = """
    INSERT INTO submission (assignment_id, student_id, file_url)
    VALUES (%s, %s, %s)
    """
    cursor.execute(query, (
        data['assignment_id'],
        data['student_id'],
        data['file_url']
    ))
    db.commit()

    return jsonify({"message": "Submission successful"})

#Grade submission
@app.route('/submissions/<int:submission_id>/grade', methods=['PUT'])
def grade_submission(submission_id):
    data = request.json
    cursor = get_cursor()

    query = "UPDATE submission SET grade = %s WHERE submission_id = %s"
    cursor.execute(query, (data['grade'], submission_id))
    db.commit()

    return jsonify({"message": "Graded successfully"})

#Get submissions for Assignment
@app.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
def get_submissions(assignment_id):
    cursor = get_cursor()

    query = "SELECT * FROM submission WHERE assignment_id = %s"
    cursor.execute(query, (assignment_id,))
    data = cursor.fetchall()

    return jsonify(data)


#''''''''''REPORTS ENDPOINTS''''''''''''

# Report 1: Courses with 50 or more students
@app.route('/reports/courses-over-50', methods=['GET'])
def report_courses_over_50():
    cursor = get_cursor()
    
    query = """
        SELECT 
            c.course_id,
            c.title,
            COUNT(e.student_id) AS total_students
        FROM course c
        INNER JOIN enrollment e ON c.course_id = e.course_id
        GROUP BY c.course_id, c.title
        HAVING total_students >= 50
        ORDER BY total_students DESC
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    return jsonify({
        "report": "Courses with 50 or more students",
        "count": len(results),
        "data": results
    })


# Report 2: Students that do 5 or more courses
@app.route('/reports/students-5-plus-courses', methods=['GET'])
def report_students_5_plus():
    cursor = get_cursor()
    
    query = """
        SELECT 
            u.user_id,
            u.full_name,
            u.username,
            COUNT(e.course_id) AS course_count
        FROM user u
        INNER JOIN enrollment e ON u.user_id = e.student_id
        WHERE u.role = 'student'
        GROUP BY u.user_id, u.full_name, u.username
        HAVING course_count >= 5
        ORDER BY course_count DESC
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    return jsonify({
        "report": "Students enrolled in 5 or more courses",
        "count": len(results),
        "data": results
    })


# Report 3: Lecturers that teach 3 or more courses
@app.route('/reports/lecturers-3-plus-courses', methods=['GET'])
def report_lecturers_3_plus():
    cursor = get_cursor()
    
    query = """
        SELECT 
            u.user_id,
            u.full_name,
            u.username,
            COUNT(cl.course_id) AS course_count
        FROM user u
        INNER JOIN course_lecturer cl ON u.user_id = cl.lecturer_id
        WHERE u.role = 'lecturer'
        GROUP BY u.user_id, u.full_name, u.username
        HAVING course_count >= 3
        ORDER BY course_count DESC
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    return jsonify({
        "report": "Lecturers teaching 3 or more courses",
        "count": len(results),
        "data": results
    })


# Report 4: Top 10 most enrolled courses
@app.route('/reports/top-10-courses', methods=['GET'])
def report_top_10_courses():
    cursor = get_cursor()
    
    query = """
        SELECT 
            c.course_id,
            c.title,
            COUNT(e.student_id) AS enrollment_count
        FROM course c
        INNER JOIN enrollment e ON c.course_id = e.course_id
        GROUP BY c.course_id, c.title
        ORDER BY enrollment_count DESC
        LIMIT 10
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    return jsonify({
        "report": "Top 10 most enrolled courses",
        "data": results
    })


# Report 5: Top 10 students with highest overall averages
@app.route('/reports/top-10-students', methods=['GET'])
def report_top_10_students():
    cursor = get_cursor()
    
    query = """
        SELECT 
            u.user_id,
            u.full_name,
            u.username,
            ROUND(AVG(s.grade), 2) AS average_grade,
            COUNT(s.submission_id) AS graded_submissions
        FROM user u
        INNER JOIN submission s ON u.user_id = s.student_id
        WHERE u.role = 'student' AND s.grade IS NOT NULL
        GROUP BY u.user_id, u.full_name, u.username
        ORDER BY average_grade DESC
        LIMIT 10
    """
    cursor.execute(query)
    results = cursor.fetchall()
    
    return jsonify({
        "report": "Top 10 students by highest overall averages",
        "data": results
    })

if __name__ == '__main__':
    app.run(debug=True)