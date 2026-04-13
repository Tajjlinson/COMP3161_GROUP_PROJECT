from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error
app = Flask(__name__)

# Database connection function
db = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",  # Your password
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



if __name__ == '__main__':
    app.run(debug=True)