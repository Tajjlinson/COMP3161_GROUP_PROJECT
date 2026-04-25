# ============================================================================
# COMP3161 Course Management System - Complete Working Version
# ============================================================================
# TEAM CONTRIBUTIONS:
# ============================================================================
# Tajaun Tomlinson     - Course Management & Enrollment (course CRUD, enrollment logic)
# Shaedane             - User Authentication & User Management (login, register, JWT, roles)
# Yashas               - Course Content, Assignments & Reports (sections, content, assignments, grading)
# Rommona              - Forums & Discussion Threads (forums, threads, replies, nested comments)
# Htut                 - Calendar Events (event creation, date filtering, student calendar)
# [Your Name]          - Full integration, API unification, database schema, file uploads,
#                        frontend routes, dashboard, course detail page, styling, testing,
#                        lecturer self-assign, search bars, scrollable tables, clickable members,
#                        and final production-ready implementation
# ============================================================================

import json
import os
import uuid
from functools import wraps
from flask import Flask, abort, flash, g, jsonify, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import mysql.connector

app = Flask(__name__)
app.secret_key = os.getenv("APP_SECRET", "comp3161-secret")
UPLOAD_ROOT = os.getenv("UPLOAD_ROOT", os.path.join(os.path.dirname(__file__), "uploads"))

ROLE_IDS = {"admin": 1, "lecturer": 2, "student": 3}


# ============================================================================
# DATABASE UTILITIES - Integrated by [Your Name]
# ============================================================================

def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Bz2pfzwzqnk3"),
        database=os.getenv("DB_NAME", "comp3161_db"),
    )


def fetch_one(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchone()


def fetch_all(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchall()


def api_error(message, status=400):
    return jsonify({"error": message}), status


def require_fields(data, fields):
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")
    return None


def save_uploaded_file(file_storage, subfolder):
    if not file_storage or not file_storage.filename:
        return None
    safe_name = secure_filename(file_storage.filename)
    if not safe_name:
        return None
    relative_dir = os.path.join(subfolder)
    absolute_dir = os.path.join(UPLOAD_ROOT, relative_dir)
    os.makedirs(absolute_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    absolute_path = os.path.join(absolute_dir, unique_name)
    file_storage.save(absolute_path)
    return os.path.join(relative_dir, unique_name).replace("\\", "/")


def get_serializer():
    from itsdangerous import URLSafeTimedSerializer
    return URLSafeTimedSerializer(os.getenv("APP_SECRET", "comp3161-secret"))


# ============================================================================
# FRONTEND ROUTES - Integrated by [Your Name]
# ============================================================================

def frontend_login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if "frontend_user" not in session:
            return redirect(url_for("frontend_login"))
        return view_func(*args, **kwargs)
    return wrapper


@app.context_processor
def inject_frontend_session():
    return {"frontend_user": session.get("frontend_user")}


@app.get("/")
def index():
    return redirect(url_for("frontend_home"))


@app.get("/app")
def frontend_home():
    if session.get("frontend_user"):
        return redirect(url_for("frontend_dashboard"))
    return redirect(url_for("frontend_login"))


# ============================================================================
# USER AUTHENTICATION - Contributed by Shaedane
# ============================================================================

@app.route("/app/login", methods=["GET", "POST"])
def frontend_login():
    """User login - Based on Shaedane's authentication logic"""
    if request.method == "POST":
        user_code = request.form.get("user_code", "").strip()
        password = request.form.get("password", "")
        
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        try:
            user = fetch_one(
                cursor,
                """SELECT u.user_id, u.user_code, u.full_name, u.password_hash, r.role_name
                   FROM users u JOIN roles r ON r.role_id = u.role_id
                   WHERE u.user_code = %s""",
                (user_code,),
            )
            
            if not user or user["password_hash"] != password:
                flash("Invalid credentials", "danger")
                return render_template("login.html")
            
            token = get_serializer().dumps({
                "user_id": user["user_id"],
                "user_code": user["user_code"],
                "role": user["role_name"],
            })
            
            session["frontend_user"] = {
                "user_id": user["user_id"],
                "user_code": user["user_code"],
                "full_name": user["full_name"],
                "role": user["role_name"],
                "token": token,
            }
            return redirect(url_for("frontend_dashboard"))
        finally:
            cursor.close()
            conn.close()
    
    return render_template("login.html")


@app.route("/app/register", methods=["GET", "POST"])
def frontend_register():
    """User registration - Based on Shaedane's user management"""
    if request.method == "POST":
        user_code = request.form.get("user_code", "").strip()
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip() or None
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")
        role = request.form.get("role", "").strip().lower()

        if role not in {"admin", "lecturer", "student"}:
            flash("Role must be admin, lecturer, or student.", "danger")
            return render_template("register.html")

        if not user_code or not full_name or not password:
            flash("User ID, full name, and password are required.", "danger")
            return render_template("register.html")

        if password != confirm_password:
            flash("Passwords do not match.", "danger")
            return render_template("register.html")

        role_id = ROLE_IDS[role]

        conn = get_db()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO users (user_code, full_name, email, password_hash, role_id)
                   VALUES (%s, %s, %s, %s, %s)""",
                (user_code, full_name, email, password, role_id),
            )
            conn.commit()
            flash("Account created successfully. You can now log in.", "success")
            return redirect(url_for("frontend_login"))
        except mysql.connector.Error as exc:
            conn.rollback()
            flash(str(exc), "danger")
            return render_template("register.html")
        finally:
            cursor.close()
            conn.close()

    return render_template("register.html")


@app.get("/app/logout")
def frontend_logout():
    session.clear()
    return redirect(url_for("frontend_login"))


@app.get("/app/dashboard")
@frontend_login_required
def frontend_dashboard():
    return render_template("dashboard.html", page_title="Dashboard")


@app.get("/app/courses/<int:course_id>")
@frontend_login_required
def frontend_course_detail(course_id):
    return render_template("course_detail.html", page_title="Course Detail", course_id=course_id)


@app.get("/uploads/<path:filename>")
def uploaded_file(filename):
    safe_root = os.path.abspath(UPLOAD_ROOT)
    requested_path = os.path.abspath(os.path.join(safe_root, filename))
    if not requested_path.startswith(safe_root):
        abort(404)
    if not os.path.exists(requested_path):
        abort(404)
    return send_from_directory(safe_root, filename, as_attachment=False)


# ============================================================================
# SESSION HELPER - Integrated by [Your Name]
# ============================================================================

def require_session():
    if "frontend_user" not in session:
        return None
    return session["frontend_user"]


# ============================================================================
# COURSE MANAGEMENT & ENROLLMENT - Contributed by Tajaun Tomlinson
# ============================================================================

@app.get("/courses/<int:course_id>")
def get_single_course(course_id):
    """Get single course details - Tajaun's course retrieval"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        course = fetch_one(cursor, 
            """SELECT course_id, course_code, course_name, description, created_by, created_at
               FROM courses WHERE course_id = %s""", 
            (course_id,))
        if not course:
            return jsonify({"error": "Course not found"}), 404
        return jsonify({"course": course})
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/members")
def get_course_members(course_id):
    """Get all members (students and lecturers) of a course - Tajaun's member management"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        course = fetch_one(cursor, "SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not course:
            return jsonify({"course_id": course_id, "members": []})
        
        members = fetch_all(
            cursor,
            """SELECT u.user_id, u.user_code, u.full_name, 'student' AS role
               FROM course_enrollments ce 
               JOIN users u ON u.user_id = ce.student_id
               WHERE ce.course_id = %s
               UNION ALL
               SELECT u.user_id, u.user_code, u.full_name, 'lecturer' AS role
               FROM course_lecturers cl 
               JOIN users u ON u.user_id = cl.lecturer_id
               WHERE cl.course_id = %s
               ORDER BY role, full_name""",
            (course_id, course_id),
        )
        return jsonify({"course_id": course_id, "count": len(members), "members": members})
    except Exception as e:
        return jsonify({"course_id": course_id, "members": [], "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/enroll")
def enroll_in_course(course_id):
    """Enroll current student in a course - Tajaun's enrollment logic"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        existing = fetch_one(cursor, "SELECT 1 FROM course_enrollments WHERE course_id = %s AND student_id = %s",
                            (course_id, current_user["user_id"]))
        if existing:
            return api_error("Already enrolled", 409)
        
        cursor.execute("INSERT INTO course_enrollments (course_id, student_id) VALUES (%s, %s)", 
                      (course_id, current_user["user_id"]))
        conn.commit()
        return jsonify({"message": "Enrolled successfully"}), 201
    except mysql.connector.Error:
        conn.rollback()
        return api_error("Enrollment failed", 400)
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/lecturer")
def assign_lecturer(course_id):
    """Assign a lecturer to a course (admin only) - Tajaun's lecturer assignment"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "admin":
        return api_error("Only admins can assign lecturers", 403)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["lecturer_id"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO course_lecturers (course_id, lecturer_id) VALUES (%s, %s)", 
                      (course_id, data["lecturer_id"]))
        conn.commit()
        return jsonify({"message": "Lecturer assigned successfully"}), 201
    except mysql.connector.Error:
        conn.rollback()
        return api_error("Assignment failed", 400)
    finally:
        cursor.close()
        conn.close()


@app.get("/courses")
def get_all_courses_list():
    """Get all courses with student counts for admin"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # For admin, include student counts
        if current_user["role"] == "admin":
            courses = fetch_all(
                cursor,
                """SELECT c.course_id, c.course_code, c.course_name, c.description,
                          COUNT(ce.student_id) as student_count
                   FROM courses c
                   LEFT JOIN course_enrollments ce ON ce.course_id = c.course_id
                   GROUP BY c.course_id
                   ORDER BY c.course_code"""
            )
        else:
            courses = fetch_all(cursor, "SELECT * FROM courses ORDER BY course_code")
        
        return jsonify({"count": len(courses), "courses": courses})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses")
def create_new_course():
    """Create a new course (admin only) - Tajaun's course creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "admin":
        return api_error("Only admins can create courses", 403)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["course_code", "course_name"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO courses (course_code, course_name, description, created_by)
               VALUES (%s, %s, %s, %s)""",
            (data["course_code"], data["course_name"], data.get("description"), current_user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Course created successfully", "course_id": cursor.lastrowid}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.get("/students/<int:student_id>/courses")
def get_student_courses(student_id):
    """Get all courses for a student - Tajaun's student course view"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] == "student" and current_user["user_id"] != student_id:
        return api_error("Students can only view their own courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        courses = fetch_all(
            cursor,
            """SELECT c.course_id, c.course_code, c.course_name, c.description
               FROM courses c
               JOIN course_enrollments ce ON ce.course_id = c.course_id
               WHERE ce.student_id = %s
               ORDER BY c.course_code""",
            (student_id,),
        )
        return jsonify({"student_id": student_id, "count": len(courses), "courses": courses})
    finally:
        cursor.close()
        conn.close()


@app.get("/lecturers/<int:lecturer_id>/courses")
def get_lecturer_courses(lecturer_id):
    """Get all courses taught by a lecturer - Tajaun's lecturer course view"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] == "lecturer" and current_user["user_id"] != lecturer_id:
        return api_error("Lecturers can only view their own courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        courses = fetch_all(
            cursor,
            """SELECT c.course_id, c.course_code, c.course_name, c.description
               FROM courses c
               JOIN course_lecturers cl ON cl.course_id = c.course_id
               WHERE cl.lecturer_id = %s
               ORDER BY c.course_code""",
            (lecturer_id,),
        )
        return jsonify({"lecturer_id": lecturer_id, "count": len(courses), "courses": courses})
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# LECTURER SELF-ASSIGN TO COURSES - Feature added by [Your Name]
# ============================================================================

@app.post("/courses/<int:course_id>/self-assign")
def lecturer_self_assign(course_id):
    """Allow lecturer to assign themselves to a course"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "lecturer":
        return api_error("Only lecturers can self-assign to courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        course = fetch_one(cursor, "SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not course:
            return api_error("Course not found", 404)
        
        existing = fetch_one(cursor, 
            "SELECT 1 FROM course_lecturers WHERE course_id = %s AND lecturer_id = %s",
            (course_id, current_user["user_id"]))
        
        if existing:
            return api_error("You are already assigned to this course", 409)
        
        course_count = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM course_lecturers WHERE lecturer_id = %s",
            (current_user["user_id"],))
        
        if course_count and course_count["count"] >= 5:
            return api_error("You cannot teach more than 5 courses", 400)
        
        cursor.execute(
            "INSERT INTO course_lecturers (course_id, lecturer_id) VALUES (%s, %s)",
            (course_id, current_user["user_id"])
        )
        conn.commit()
        
        return jsonify({
            "message": "You have been successfully assigned to this course",
            "course_id": course_id,
            "lecturer_id": current_user["user_id"]
        }), 201
        
    except mysql.connector.Error as e:
        conn.rollback()
        return api_error(f"Failed to assign: {str(e)}", 400)
    finally:
        cursor.close()
        conn.close()


@app.delete("/courses/<int:course_id>/self-remove")
def lecturer_self_remove(course_id):
    """Allow lecturer to remove themselves from a course"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "lecturer":
        return api_error("Only lecturers can remove themselves from courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        existing = fetch_one(cursor,
            "SELECT 1 FROM course_lecturers WHERE course_id = %s AND lecturer_id = %s",
            (course_id, current_user["user_id"]))
        
        if not existing:
            return api_error("You are not assigned to this course", 404)
        
        cursor.execute(
            "DELETE FROM course_lecturers WHERE course_id = %s AND lecturer_id = %s",
            (course_id, current_user["user_id"])
        )
        conn.commit()
        
        return jsonify({
            "message": "You have been removed from this course",
            "course_id": course_id,
            "lecturer_id": current_user["user_id"]
        }), 200
        
    except mysql.connector.Error as e:
        conn.rollback()
        return api_error(f"Failed to remove: {str(e)}", 400)
    finally:
        cursor.close()
        conn.close()


@app.get("/lecturers/<int:lecturer_id>/available-courses")
def get_available_courses_for_lecturer(lecturer_id):
    """Get courses that a lecturer is NOT already assigned to"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] == "lecturer" and current_user["user_id"] != lecturer_id:
        return api_error("Lecturers can only view their own available courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        current_count = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM course_lecturers WHERE lecturer_id = %s",
            (lecturer_id,))
        
        max_courses = 5
        remaining = max_courses - (current_count["count"] if current_count else 0)
        
        courses = fetch_all(
            cursor,
            """SELECT c.course_id, c.course_code, c.course_name, c.description
               FROM courses c
               WHERE c.course_id NOT IN (
                   SELECT course_id FROM course_lecturers WHERE lecturer_id = %s
               )
               ORDER BY c.course_code""",
            (lecturer_id,)
        )
        
        return jsonify({
            "lecturer_id": lecturer_id,
            "current_course_count": current_count["count"] if current_count else 0,
            "max_courses": max_courses,
            "remaining_slots": remaining,
            "available_courses": courses
        })
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# CALENDAR EVENTS - Contributed by Htut
# ============================================================================

@app.get("/courses/<int:course_id>/events")
def get_course_events(course_id):
    """Get all events for a course - Htut's calendar view"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        events = fetch_all(cursor, 
            """SELECT event_id, title, description, start_datetime, end_datetime, created_by, created_at
               FROM calendar_events WHERE course_id = %s ORDER BY start_datetime""", 
            (course_id,))
        
        for event in events:
            if event.get('start_datetime'):
                event['start_datetime'] = str(event['start_datetime'])
            if event.get('end_datetime'):
                event['end_datetime'] = str(event['end_datetime'])
            if event.get('created_at'):
                event['created_at'] = str(event['created_at'])
        
        return jsonify({"course_id": course_id, "count": len(events), "events": events})
    except Exception as e:
        return jsonify({"course_id": course_id, "events": [], "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/events")
def create_calendar_event(course_id):
    """Create a calendar event for a course - Htut's event creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["title", "start_datetime"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO calendar_events (course_id, title, description, start_datetime, end_datetime, created_by)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (course_id, data["title"], data.get("description"), data["start_datetime"],
             data.get("end_datetime"), current_user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Calendar event created successfully", "event_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/students/<int:student_id>/events")
def get_student_events_api(student_id):
    """Get events for a student with optional date filter - Htut's student calendar"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    date_value = request.args.get("date")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """SELECT ce.event_id, ce.course_id, c.course_code, c.course_name, ce.title, ce.description, ce.start_datetime, ce.end_datetime
                   FROM calendar_events ce
                   JOIN courses c ON c.course_id = ce.course_id
                   JOIN course_enrollments enr ON enr.course_id = ce.course_id
                   WHERE enr.student_id = %s"""
        params = [student_id]
        
        if date_value:
            query += " AND DATE(ce.start_datetime) = %s"
            params.append(date_value)
        
        query += " ORDER BY ce.start_datetime"
        events = fetch_all(cursor, query, tuple(params))
        
        for event in events:
            if event.get('start_datetime'):
                event['start_datetime'] = str(event['start_datetime'])
            if event.get('end_datetime'):
                event['end_datetime'] = str(event['end_datetime'])
        
        return jsonify({"student_id": student_id, "date": date_value, "count": len(events), "events": events})
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# FORUMS & DISCUSSION THREADS - Contributed by Rommona
# ============================================================================

@app.get("/courses/<int:course_id>/forums")
def get_course_forums(course_id):
    """Get all forums for a course - Rommona's forum listing"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        forums = fetch_all(cursor, 
            """SELECT forum_id, title, description, created_by, created_at
               FROM forums WHERE course_id = %s ORDER BY created_at DESC""", 
            (course_id,))
        
        for forum in forums:
            if forum.get('created_at'):
                forum['created_at'] = str(forum['created_at'])
        
        return jsonify({"course_id": course_id, "count": len(forums), "forums": forums})
    except Exception as e:
        return jsonify({"course_id": course_id, "forums": [], "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/forums")
def create_forum(course_id):
    """Create a forum for a course - Rommona's forum creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["title"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO forums (course_id, title, description, created_by)
               VALUES (%s, %s, %s, %s)""",
            (course_id, data["title"], data.get("description"), current_user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Forum created successfully", "forum_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/forums/<int:forum_id>/threads")
def get_forum_threads(forum_id):
    """Get all threads in a forum with user names - Rommona's thread listing"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        threads = fetch_all(
            cursor,
            """SELECT dt.thread_id, dt.title, dt.created_by, dt.created_at,
                      u.full_name as creator_name, u.user_code as creator_code,
                      (SELECT tp.body FROM thread_posts tp 
                       WHERE tp.thread_id = dt.thread_id AND tp.parent_post_id IS NULL LIMIT 1) AS starter_post
               FROM discussion_threads dt 
               JOIN users u ON u.user_id = dt.created_by
               WHERE dt.forum_id = %s 
               ORDER BY dt.created_at DESC""",
            (forum_id,),
        )
        
        for thread in threads:
            if thread.get('created_at'):
                thread['created_at'] = str(thread['created_at'])
        
        return jsonify({"forum_id": forum_id, "count": len(threads), "threads": threads})
    finally:
        cursor.close()
        conn.close()


@app.post("/forums/<int:forum_id>/threads")
def create_thread(forum_id):
    """Create a discussion thread in a forum - Rommona's thread creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["title", "body"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO discussion_threads (forum_id, title, created_by) VALUES (%s, %s, %s)",
                      (forum_id, data["title"], current_user["user_id"]))
        thread_id = cursor.lastrowid
        
        cursor.execute("INSERT INTO thread_posts (thread_id, parent_post_id, user_id, body) VALUES (%s, NULL, %s, %s)",
                      (thread_id, current_user["user_id"], data["body"]))
        conn.commit()
        return jsonify({"message": "Thread created successfully", "thread_id": thread_id}), 201
    finally:
        cursor.close()
        conn.close()


@app.post("/threads/<int:thread_id>/replies")
def create_reply(thread_id):
    """Create a reply in a thread - Rommona's reply system"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["body"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO thread_posts (thread_id, parent_post_id, user_id, body) VALUES (%s, %s, %s, %s)",
                      (thread_id, data.get("parent_post_id"), current_user["user_id"], data["body"]))
        conn.commit()
        return jsonify({"message": "Reply added successfully", "post_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/threads/<int:thread_id>/posts")
def get_thread_posts(thread_id):
    """Get all posts in a thread with user names - Rommona's post viewing"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        posts = fetch_all(cursor, 
            """SELECT tp.post_id, tp.thread_id, tp.parent_post_id, tp.user_id, tp.body, tp.created_at,
                      u.full_name, u.user_code
               FROM thread_posts tp
               JOIN users u ON u.user_id = tp.user_id
               WHERE tp.thread_id = %s 
               ORDER BY tp.created_at""", 
            (thread_id,))
        
        for post in posts:
            if post.get('created_at'):
                post['created_at'] = str(post['created_at'])
        
        return jsonify({"thread_id": thread_id, "count": len(posts), "posts": posts})
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# COURSE CONTENT & ASSIGNMENTS - Contributed by Yashas
# ============================================================================

@app.get("/courses/<int:course_id>/content")
def get_course_content(course_id):
    """Get all content for a course - Yashas' content management"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        content = fetch_all(
            cursor,
            """SELECT s.section_id, s.title AS section_title, s.position_no,
                      cc.content_id, cc.title, cc.content_type, cc.resource_url, cc.file_reference, cc.description
               FROM content_sections s
               LEFT JOIN course_contents cc ON cc.section_id = s.section_id
               WHERE s.course_id = %s
               ORDER BY s.position_no, cc.created_at""",
            (course_id,),
        )
        
        for item in content:
            if item.get("file_reference"):
                item["file_url"] = f"/uploads/{item['file_reference']}"
                item["download_url"] = f"/uploads/{item['file_reference']}"
        
        return jsonify({"course_id": course_id, "count": len(content), "content": content})
    except Exception as e:
        return jsonify({"course_id": course_id, "content": [], "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/sections")
def create_section(course_id):
    """Create a content section - Yashas' section creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["title", "position_no"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO content_sections (course_id, title, position_no) VALUES (%s, %s, %s)",
                      (course_id, data["title"], data["position_no"]))
        conn.commit()
        return jsonify({"message": "Section created successfully", "section_id": cursor.lastrowid}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.post("/sections/<int:section_id>/content")
def add_course_content(section_id):
    """Add content to a section - Yashas' content addition"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        uploaded_file = request.files.get("file")
    else:
        data = request.get_json(silent=True) or {}
        uploaded_file = None
    
    validation = require_fields(data, ["title", "content_type"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        section = fetch_one(cursor, "SELECT section_id, course_id FROM content_sections WHERE section_id = %s", (section_id,))
        if not section:
            return api_error("Section not found", 404)
        
        file_reference = data.get("file_reference")
        if uploaded_file and uploaded_file.filename:
            file_reference = save_uploaded_file(uploaded_file, "content")
        
        cursor.execute(
            """INSERT INTO course_contents (course_id, section_id, title, content_type, resource_url, file_reference, description, uploaded_by)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (section["course_id"], section_id, data["title"], data["content_type"],
             data.get("resource_url"), file_reference, data.get("description"), current_user["user_id"]),
        )
        conn.commit()
        
        file_url = f"/uploads/{file_reference}" if file_reference else None
        download_url = f"/uploads/{file_reference}" if file_reference else None
        
        return jsonify({
            "message": "Course content added successfully",
            "content_id": cursor.lastrowid,
            "file_reference": file_reference,
            "file_url": file_url,
            "download_url": download_url,
        }), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/assignments")
def get_course_assignments(course_id):
    """Get all assignments for a course - Yashas' assignment viewing"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        assignments = fetch_all(cursor, 
            """SELECT assignment_id, title, description, due_datetime, max_score, created_by, created_at
               FROM assignments WHERE course_id = %s ORDER BY due_datetime""", 
            (course_id,))
        
        for assignment in assignments:
            if assignment.get('due_datetime'):
                assignment['due_datetime'] = str(assignment['due_datetime'])
            if assignment.get('created_at'):
                assignment['created_at'] = str(assignment['created_at'])
        
        current_user = require_session()
        if current_user and current_user["role"] == "student":
            for assignment in assignments:
                sub = fetch_one(cursor,
                    """SELECT submission_id, submitted_at, submission_url
                       FROM assignment_submissions 
                       WHERE assignment_id = %s AND student_id = %s""",
                    (assignment["assignment_id"], current_user["user_id"]))
                if sub:
                    assignment["submission_id"] = sub["submission_id"]
                    if sub.get('submitted_at'):
                        assignment["submitted_at"] = str(sub["submitted_at"])
                    assignment["submission_url"] = sub["submission_url"]
                
                grade = fetch_one(cursor,
                    """SELECT score, feedback
                       FROM assignment_grades 
                       WHERE submission_id IN (SELECT submission_id FROM assignment_submissions 
                                               WHERE assignment_id = %s AND student_id = %s)""",
                    (assignment["assignment_id"], current_user["user_id"]))
                if grade:
                    assignment["score"] = grade["score"]
                    assignment["feedback"] = grade["feedback"]
        
        return jsonify({"course_id": course_id, "count": len(assignments), "assignments": assignments})
    except Exception as e:
        return jsonify({"course_id": course_id, "assignments": [], "error": str(e)})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/assignments")
def create_assignment(course_id):
    """Create an assignment - Yashas' assignment creation"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    data = request.get_json(silent=True) or {}
    validation = require_fields(data, ["title", "due_datetime"])
    if validation:
        return validation
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO assignments (course_id, title, description, due_datetime, max_score, created_by)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (course_id, data["title"], data.get("description"), data["due_datetime"],
             data.get("max_score", 100), current_user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Assignment created successfully", "assignment_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.post("/assignments/<int:assignment_id>/submissions")
def submit_assignment(assignment_id):
    """Submit an assignment - Yashas' submission handling"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
        uploaded_file = request.files.get("file")
    else:
        data = request.get_json(silent=True) or {}
        uploaded_file = None
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        submission_url = data.get("submission_url")
        if uploaded_file and uploaded_file.filename:
            saved_path = save_uploaded_file(uploaded_file, "submissions")
            submission_url = f"/uploads/{saved_path}" if saved_path else submission_url
        
        cursor.execute(
            "INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submission_url) VALUES (%s, %s, %s, %s)",
            (assignment_id, current_user["user_id"], data.get("submission_text"), submission_url),
        )
        conn.commit()
        return jsonify({"message": "Assignment submitted successfully", "submission_id": cursor.lastrowid}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()
# ============================================================================
# ADMIN COURSE MANAGEMENT - Edit and Delete Courses
# ============================================================================

@app.put("/courses/<int:course_id>")
def update_course(course_id):
    """Update course details (admin only)"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "admin":
        return api_error("Only admins can update courses", 403)
    
    data = request.get_json(silent=True) or {}
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if course exists
        course = fetch_one(cursor, "SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not course:
            return api_error("Course not found", 404)
        
        # Build update query dynamically based on provided fields
        updates = []
        params = []
        
        if "course_code" in data:
            updates.append("course_code = %s")
            params.append(data["course_code"])
        
        if "course_name" in data:
            updates.append("course_name = %s")
            params.append(data["course_name"])
        
        if "description" in data:
            updates.append("description = %s")
            params.append(data["description"])
        
        if not updates:
            return api_error("No fields to update", 400)
        
        params.append(course_id)
        query = f"UPDATE courses SET {', '.join(updates)} WHERE course_id = %s"
        cursor.execute(query, tuple(params))
        conn.commit()
        
        # Get updated course
        updated_course = fetch_one(cursor, 
            "SELECT course_id, course_code, course_name, description FROM courses WHERE course_id = %s",
            (course_id,))
        
        return jsonify({
            "message": "Course updated successfully",
            "course": updated_course
        }), 200
        
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.delete("/courses/<int:course_id>")
def delete_course(course_id):
    """Delete a course and all related data (admin only)"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "admin":
        return api_error("Only admins can delete courses", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if course exists
        course = fetch_one(cursor, 
            "SELECT course_id, course_code, course_name FROM courses WHERE course_id = %s",
            (course_id,))
        if not course:
            return api_error("Course not found", 404)
        
        course_code = course["course_code"]
        course_name = course["course_name"]
        
        # Delete course (cascade will handle related tables)
        cursor.execute("DELETE FROM courses WHERE course_id = %s", (course_id,))
        conn.commit()
        
        return jsonify({
            "message": f"Course '{course_code} - {course_name}' deleted successfully",
            "deleted_course": course
        }), 200
        
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(f"Failed to delete course: {str(exc)}", 400)
    finally:
        cursor.close()
        conn.close()


@app.get("/admin/courses/<int:course_id>/related-data")
def get_course_related_data(course_id):
    """Get counts of related data before deletion (admin only)"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    if current_user["role"] != "admin":
        return api_error("Only admins can view this data", 403)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if course exists
        course = fetch_one(cursor, "SELECT * FROM courses WHERE course_id = %s", (course_id,))
        if not course:
            return api_error("Course not found", 404)
        
        # Get counts of related data
        enrollments = fetch_one(cursor, 
            "SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = %s", (course_id,))
        
        lecturers = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM course_lecturers WHERE course_id = %s", (course_id,))
        
        events = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM calendar_events WHERE course_id = %s", (course_id,))
        
        forums = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM forums WHERE course_id = %s", (course_id,))
        
        sections = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM content_sections WHERE course_id = %s", (course_id,))
        
        assignments = fetch_one(cursor,
            "SELECT COUNT(*) as count FROM assignments WHERE course_id = %s", (course_id,))
        
        return jsonify({
            "course": course,
            "related_counts": {
                "students_enrolled": enrollments["count"] if enrollments else 0,
                "lecturers_assigned": lecturers["count"] if lecturers else 0,
                "calendar_events": events["count"] if events else 0,
                "forums": forums["count"] if forums else 0,
                "content_sections": sections["count"] if sections else 0,
                "assignments": assignments["count"] if assignments else 0
            }
        })
    finally:
        cursor.close()
        conn.close()

# ============================================================================
# REPORTS - Contributed by Yashas
# ============================================================================

@app.get("/reports/courses-50-plus")
def report_courses_50_plus():
    """Courses with 50 or more students - Yashas' report requirement"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        results = fetch_all(
            cursor,
            """SELECT c.course_id, c.course_code, c.course_name, COUNT(ce.student_id) as student_count
               FROM courses c
               JOIN course_enrollments ce ON ce.course_id = c.course_id
               GROUP BY c.course_id
               HAVING COUNT(ce.student_id) >= 50"""
        )
        return jsonify({"results": results})
    finally:
        cursor.close()
        conn.close()


@app.get("/reports/students-5-plus")
def report_students_5_plus():
    """Students enrolled in 5 or more courses - Yashas' report requirement"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        results = fetch_all(
            cursor,
            """SELECT u.user_id, u.user_code, u.full_name, COUNT(ce.course_id) as course_count
               FROM users u
               JOIN course_enrollments ce ON ce.student_id = u.user_id
               WHERE u.role_id = 3
               GROUP BY u.user_id
               HAVING COUNT(ce.course_id) >= 5"""
        )
        return jsonify({"results": results})
    finally:
        cursor.close()
        conn.close()


@app.get("/reports/lecturers-3-plus")
def report_lecturers_3_plus():
    """Lecturers teaching 3 or more courses - Yashas' report requirement"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        results = fetch_all(
            cursor,
            """SELECT u.user_id, u.user_code, u.full_name, COUNT(cl.course_id) as course_count
               FROM users u
               JOIN course_lecturers cl ON cl.lecturer_id = u.user_id
               WHERE u.role_id = 2
               GROUP BY u.user_id
               HAVING COUNT(cl.course_id) >= 3"""
        )
        return jsonify({"results": results})
    finally:
        cursor.close()
        conn.close()


@app.get("/reports/top-10-courses")
def report_top_10_courses():
    """Top 10 most enrolled courses - Yashas' report requirement"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        results = fetch_all(
            cursor,
            """SELECT c.course_id, c.course_code, c.course_name, COUNT(ce.student_id) as student_count
               FROM courses c
               LEFT JOIN course_enrollments ce ON ce.course_id = c.course_id
               GROUP BY c.course_id
               ORDER BY student_count DESC
               LIMIT 10"""
        )
        return jsonify({"results": results})
    finally:
        cursor.close()
        conn.close()


@app.get("/reports/top-10-students")
def report_top_10_students():
    """Top 10 students by assignment average - Yashas' report requirement"""
    current_user = require_session()
    if not current_user:
        return api_error("Authentication required", 401)
    
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        results = fetch_all(
            cursor,
            """SELECT u.user_id, u.user_code, u.full_name, 
                      ROUND(AVG((ag.score / a.max_score) * 100), 2) as overall_average
               FROM users u
               JOIN assignment_submissions s ON s.student_id = u.user_id
               JOIN assignment_grades ag ON ag.submission_id = s.submission_id
               JOIN assignments a ON a.assignment_id = s.assignment_id
               WHERE u.role_id = 3
               GROUP BY u.user_id
               ORDER BY overall_average DESC
               LIMIT 10"""
        )
        return jsonify({"results": results})
    finally:
        cursor.close()
        conn.close()


# ============================================================================
# API ROOT 
# ============================================================================

@app.get("/api")
def api_root():
    return jsonify({"message": "COMP3161 Course Management API", "status": "running"})


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))