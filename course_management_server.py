from flask import Flask, request, jsonify
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Bz2pfzwzqnk3"),
        database=os.getenv("DB_NAME", "comp3161_db")
    )


# ─────────────────────────────────────────────
# POST /courses  →  Admin creates a course
# ─────────────────────────────────────────────
@app.route("/courses", methods=["POST"])
def create_course():
    data = request.get_json()

    course_name   = data.get("course_name")
    created_by    = data.get("created_by_admin")

    if not course_name or not created_by:
        return jsonify({"error": "course_name and created_by_admin are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO courses (course_name, created_by_admin) VALUES (%s, %s)",
            (course_name, created_by)
        )
        conn.commit()
        course_id = cursor.lastrowid
        return jsonify({"message": "Course created", "course_id": course_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─────────────────────────────────────────────
# GET /courses  →  Retrieve all courses
# ─────────────────────────────────────────────
@app.route("/courses", methods=["GET"])
def get_all_courses():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM courses")
        courses = cursor.fetchall()
        return jsonify(courses), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route("/courses/<int:course_id>/members", methods=["GET"])
def get_course_members(course_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Course not found"}), 404

        cursor.execute("""
            SELECT student_id, 'student' AS role FROM course_enrollments WHERE course_id = %s
            UNION ALL
            SELECT lecturer_id, 'lecturer' AS role FROM course_lecturers WHERE course_id = %s
        """, (course_id, course_id))
        members = cursor.fetchall()
        return jsonify(members), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ─────────────────────────────────────────────
# GET /courses/student/<id>  →  Courses for a student
# ─────────────────────────────────────────────
@app.route("/courses/student/<int:student_id>", methods=["GET"])
def get_courses_for_student(student_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.course_id, c.course_name, c.created_by_admin
            FROM courses c
            JOIN course_enrollments ce ON c.course_id = ce.course_id
            WHERE ce.student_id = %s
        """, (student_id,))
        courses = cursor.fetchall()
        return jsonify(courses), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─────────────────────────────────────────────
# GET /courses/lecturer/<id>  →  Courses taught by lecturer
# ─────────────────────────────────────────────
@app.route("/courses/lecturer/<int:lecturer_id>", methods=["GET"])
def get_courses_for_lecturer(lecturer_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.course_id, c.course_name, c.created_by_admin
            FROM courses c
            JOIN course_lecturers cl ON c.course_id = cl.course_id
            WHERE cl.lecturer_id = %s
        """, (lecturer_id,))
        courses = cursor.fetchall()
        return jsonify(courses), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ─────────────────────────────────────────────
# POST /courses/<id>/register  →  Student registers in course
# ─────────────────────────────────────────────
@app.route("/courses/<int:course_id>/register", methods=["POST"])
def register_student(course_id):
    data = request.get_json()
    student_id = data.get("student_id")

    if not student_id:
        return jsonify({"error": "student_id is required"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check course exists
        cursor.execute("SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Course not found"}), 404

        # Check for duplicate enrollment
        cursor.execute(
            "SELECT enrollment_id FROM course_enrollments WHERE course_id = %s AND student_id = %s",
            (course_id, student_id)
        )
        if cursor.fetchone():
            return jsonify({"error": "Student already enrolled in this course"}), 409

        cursor.execute(
            "INSERT INTO course_enrollments (course_id, student_id) VALUES (%s, %s)",
            (course_id, student_id)
        )
        conn.commit()
        return jsonify({"message": "Student registered successfully", "enrollment_id": cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    app.run(debug=True)