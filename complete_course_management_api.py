import json
import os
from functools import wraps

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv():
        return False

import mysql.connector
from flask import Flask, flash, g, jsonify, redirect, render_template, request, session, url_for
from itsdangerous import BadSignature, BadTimeSignature, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

try:
    import redis
except ImportError:
    redis = None

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("APP_SECRET", "comp3161-secret")

ROLE_IDS = {
    "admin": 1,
    "lecturer": 2,
    "student": 3,
}


def get_db():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Bz2pfzwzqnk3"),
        database=os.getenv("DB_NAME", "comp3161_db"),
    )


def get_serializer():
    return URLSafeTimedSerializer(os.getenv("APP_SECRET", "comp3161-secret"))


def api_error(message, status=400):
    return jsonify({"error": message}), status


def get_cache_client():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url or redis is None:
        return None
    try:
        return redis.from_url(redis_url, decode_responses=True)
    except Exception:
        return None


def cache_get_json(key):
    client = get_cache_client()
    if not client:
        return None
    try:
        cached = client.get(key)
        return json.loads(cached) if cached else None
    except Exception:
        return None


def cache_set_json(key, value, ttl=120):
    client = get_cache_client()
    if not client:
        return
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        return


def invalidate_cache(*patterns):
    client = get_cache_client()
    if not client:
        return
    try:
        for pattern in patterns:
            for key in client.scan_iter(match=pattern):
                client.delete(key)
    except Exception:
        return


def password_matches(stored_value, supplied_password):
    if not stored_value:
        return False
    if stored_value == supplied_password:
        return True
    try:
        return check_password_hash(stored_value, supplied_password)
    except ValueError:
        return False


def parse_token():
    auth_header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if not auth_header.startswith(prefix):
        return None
    token = auth_header[len(prefix):].strip()
    if not token:
        return None

    serializer = get_serializer()
    try:
        return serializer.loads(token, max_age=60 * 60 * 24)
    except (BadSignature, BadTimeSignature):
        return None


def auth_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            identity = parse_token()
            if not identity:
                return api_error("Authentication required", 401)

            g.current_user = identity
            if allowed_roles and identity["role"] not in allowed_roles:
                return api_error("You do not have permission for this action", 403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def get_json_body():
    data = request.get_json(silent=True)
    return data or {}


def require_fields(data, fields):
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return api_error(f"Missing required fields: {', '.join(missing)}")
    return None


def fetch_one(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchone()


def fetch_all(cursor, query, params=()):
    cursor.execute(query, params)
    return cursor.fetchall()


def get_authenticated_user(user_code, password):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        user = fetch_one(
            cursor,
            """
            SELECT u.user_id, u.user_code, u.full_name, u.password_hash, r.role_name
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.user_code = %s
            """,
            (user_code,),
        )
        if not user or not password_matches(user["password_hash"], password):
            return None
        return user
    finally:
        cursor.close()
        conn.close()


def get_user_by_id(cursor, user_id):
    return fetch_one(
        cursor,
        """
        SELECT u.user_id, u.user_code, u.full_name, r.role_name
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = %s
        """,
        (user_id,),
    )


def get_course(cursor, course_id):
    return fetch_one(
        cursor,
        """
        SELECT c.course_id, c.course_code, c.course_name, c.description, c.created_by, c.created_at
        FROM courses c
        WHERE c.course_id = %s
        """,
        (course_id,),
    )


def ensure_course_exists(cursor, course_id):
    course = get_course(cursor, course_id)
    if not course:
        return None, api_error("Course not found", 404)
    return course, None


def is_course_student(cursor, course_id, user_id):
    row = fetch_one(
        cursor,
        "SELECT 1 FROM course_enrollments WHERE course_id = %s AND student_id = %s",
        (course_id, user_id),
    )
    return bool(row)


def is_course_lecturer(cursor, course_id, user_id):
    row = fetch_one(
        cursor,
        "SELECT 1 FROM course_lecturers WHERE course_id = %s AND lecturer_id = %s",
        (course_id, user_id),
    )
    return bool(row)


def index_response():
    return {
        "message": "COMP3161 Course Management API",
        "docs": [
            "/auth/register",
            "/auth/login",
            "/courses",
            "/reports/courses-50-plus",
        ],
    }


@app.get("/")
def index():
    return redirect(url_for("frontend_home"))


@app.get("/api")
def api_index():
    return jsonify(index_response())


def is_course_member(cursor, course_id, user_id):
    return is_course_student(cursor, course_id, user_id) or is_course_lecturer(cursor, course_id, user_id)


def frontend_login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        if "frontend_user" not in session:
            return redirect(url_for("frontend_login"))
        return view_func(*args, **kwargs)

    return wrapper


@app.context_processor
def inject_frontend_session():
    return {
        "frontend_user": session.get("frontend_user"),
    }


@app.get("/app")
def frontend_home():
    if session.get("frontend_user"):
        return redirect(url_for("frontend_dashboard"))
    return redirect(url_for("frontend_login"))


@app.route("/app/login", methods=["GET", "POST"])
def frontend_login():
    if request.method == "POST":
        user_code = request.form.get("user_code", "").strip()
        password = request.form.get("password", "")
        user = get_authenticated_user(user_code, password)
        if not user:
            flash("Invalid credentials", "danger")
            return render_template("login.html")

        token = get_serializer().dumps(
            {
                "user_id": user["user_id"],
                "user_code": user["user_code"],
                "role": user["role_name"],
            }
        )
        session["frontend_user"] = {
            "user_id": user["user_id"],
            "user_code": user["user_code"],
            "full_name": user["full_name"],
            "role": user["role_name"],
            "token": token,
        }
        return redirect(url_for("frontend_dashboard"))

    return render_template("login.html")


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


@app.post("/auth/register")
def register_user():
    data = get_json_body()
    validation = require_fields(data, ["user_code", "full_name", "password", "role"])
    if validation:
        return validation

    role = str(data["role"]).strip().lower()
    role_id = ROLE_IDS.get(role)
    if not role_id:
        return api_error("Role must be admin, lecturer, or student")

    password_hash = generate_password_hash(data["password"])
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            INSERT INTO users (user_code, full_name, email, password_hash, role_id)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data["user_code"],
                data["full_name"],
                data.get("email"),
                password_hash,
                role_id,
            ),
        )
        conn.commit()
        user = get_user_by_id(cursor, cursor.lastrowid)
        return jsonify({"message": "User registered successfully", "user": user}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.post("/auth/login")
def login():
    data = get_json_body()
    validation = require_fields(data, ["user_code", "password"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        user = fetch_one(
            cursor,
            """
            SELECT u.user_id, u.user_code, u.full_name, u.password_hash, r.role_name
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.user_code = %s
            """,
            (data["user_code"],),
        )

        if not user or not password_matches(user["password_hash"], data["password"]):
            return api_error("Invalid credentials", 401)

        token = get_serializer().dumps(
            {
                "user_id": user["user_id"],
                "user_code": user["user_code"],
                "role": user["role_name"],
            }
        )
        return jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": {
                    "user_id": user["user_id"],
                    "user_code": user["user_code"],
                    "full_name": user["full_name"],
                    "role": user["role_name"],
                },
            }
        )
    finally:
        cursor.close()
        conn.close()


@app.post("/courses")
@auth_required("admin")
def create_course():
    data = get_json_body()
    validation = require_fields(data, ["course_code", "course_name"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO courses (course_code, course_name, description, created_by)
            VALUES (%s, %s, %s, %s)
            """,
            (
                data["course_code"],
                data["course_name"],
                data.get("description"),
                g.current_user["user_id"],
            ),
        )
        conn.commit()
        invalidate_cache("courses:*", "reports:*")
        course = get_course(cursor, cursor.lastrowid)
        return jsonify({"message": "Course created successfully", "course": course}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.get("/courses")
@auth_required("admin", "lecturer", "student")
def get_all_courses():
    cache_key = "courses:all"
    cached = cache_get_json(cache_key)
    if cached is not None:
        return jsonify(cached)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        courses = fetch_all(
            cursor,
            """
            SELECT c.course_id, c.course_code, c.course_name, c.description, c.created_by, c.created_at
            FROM courses c
            ORDER BY c.course_code
            """,
        )
        payload = {"count": len(courses), "courses": courses}
        cache_set_json(cache_key, payload, ttl=180)
        return jsonify(payload)
    finally:
        cursor.close()
        conn.close()


@app.get("/students/<int:student_id>/courses")
@auth_required("admin", "student")
def get_student_courses(student_id):
    if g.current_user["role"] == "student" and g.current_user["user_id"] != student_id:
        return api_error("Students can only view their own courses", 403)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        courses = fetch_all(
            cursor,
            """
            SELECT c.course_id, c.course_code, c.course_name
            FROM courses c
            JOIN course_enrollments ce ON ce.course_id = c.course_id
            WHERE ce.student_id = %s
            ORDER BY c.course_code
            """,
            (student_id,),
        )
        return jsonify({"student_id": student_id, "count": len(courses), "courses": courses})
    finally:
        cursor.close()
        conn.close()


@app.get("/lecturers/<int:lecturer_id>/courses")
@auth_required("admin", "lecturer")
def get_lecturer_courses(lecturer_id):
    if g.current_user["role"] == "lecturer" and g.current_user["user_id"] != lecturer_id:
        return api_error("Lecturers can only view their own courses", 403)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        courses = fetch_all(
            cursor,
            """
            SELECT c.course_id, c.course_code, c.course_name
            FROM courses c
            JOIN course_lecturers cl ON cl.course_id = c.course_id
            WHERE cl.lecturer_id = %s
            ORDER BY c.course_code
            """,
            (lecturer_id,),
        )
        return jsonify({"lecturer_id": lecturer_id, "count": len(courses), "courses": courses})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/lecturer")
@auth_required("admin")
def assign_lecturer_to_course(course_id):
    data = get_json_body()
    validation = require_fields(data, ["lecturer_id"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        lecturer = get_user_by_id(cursor, data["lecturer_id"])
        if not lecturer or lecturer["role_name"] != "lecturer":
            return api_error("Lecturer not found", 404)

        existing = fetch_one(
            cursor,
            "SELECT lecturer_id FROM course_lecturers WHERE course_id = %s",
            (course_id,),
        )
        if existing:
            return api_error("This course already has a lecturer assigned", 409)

        lecturer_load = fetch_one(
            cursor,
            "SELECT COUNT(*) AS course_count FROM course_lecturers WHERE lecturer_id = %s",
            (data["lecturer_id"],),
        )
        if lecturer_load["course_count"] >= 5:
            return api_error("Lecturer cannot teach more than 5 courses", 400)

        cursor.execute(
            "INSERT INTO course_lecturers (course_id, lecturer_id) VALUES (%s, %s)",
            (course_id, data["lecturer_id"]),
        )
        conn.commit()
        invalidate_cache("reports:*")
        return jsonify({"message": "Lecturer assigned successfully"}), 201
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/enroll")
@auth_required("admin", "student")
def register_for_course(course_id):
    data = get_json_body()
    student_id = data.get("student_id", g.current_user["user_id"])

    if g.current_user["role"] == "student" and student_id != g.current_user["user_id"]:
        return api_error("Students can only enroll themselves", 403)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        student = get_user_by_id(cursor, student_id)
        if not student or student["role_name"] != "student":
            return api_error("Student not found", 404)

        existing = fetch_one(
            cursor,
            "SELECT 1 FROM course_enrollments WHERE course_id = %s AND student_id = %s",
            (course_id, student_id),
        )
        if existing:
            return api_error("Student already enrolled in this course", 409)

        load = fetch_one(
            cursor,
            "SELECT COUNT(*) AS course_count FROM course_enrollments WHERE student_id = %s",
            (student_id,),
        )
        if load["course_count"] >= 6:
            return api_error("Student cannot enroll in more than 6 courses", 400)

        cursor.execute(
            "INSERT INTO course_enrollments (course_id, student_id) VALUES (%s, %s)",
            (course_id, student_id),
        )
        conn.commit()
        invalidate_cache("reports:*", "courses:*")
        return jsonify({"message": "Student enrolled successfully"}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/members")
@auth_required("admin", "lecturer", "student")
def get_course_members(course_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        members = fetch_all(
            cursor,
            """
            SELECT u.user_id, u.user_code, u.full_name, 'student' AS role
            FROM course_enrollments ce
            JOIN users u ON u.user_id = ce.student_id
            WHERE ce.course_id = %s
            UNION ALL
            SELECT u.user_id, u.user_code, u.full_name, 'lecturer' AS role
            FROM course_lecturers cl
            JOIN users u ON u.user_id = cl.lecturer_id
            WHERE cl.course_id = %s
            ORDER BY role, full_name
            """,
            (course_id, course_id),
        )
        return jsonify({"course_id": course_id, "count": len(members), "members": members})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/events")
@auth_required("admin", "lecturer")
def create_calendar_event(course_id):
    data = get_json_body()
    validation = require_fields(data, ["title", "start_datetime"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, course_id, g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can create events for this course", 403)

        cursor.execute(
            """
            INSERT INTO calendar_events (course_id, title, description, start_datetime, end_datetime, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                course_id,
                data["title"],
                data.get("description"),
                data["start_datetime"],
                data.get("end_datetime"),
                g.current_user["user_id"],
            ),
        )
        conn.commit()
        return jsonify({"message": "Calendar event created successfully", "event_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/events")
@auth_required("admin", "lecturer", "student")
def get_course_events(course_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        events = fetch_all(
            cursor,
            """
            SELECT event_id, title, description, start_datetime, end_datetime, created_by, created_at
            FROM calendar_events
            WHERE course_id = %s
            ORDER BY start_datetime
            """,
            (course_id,),
        )
        return jsonify({"course_id": course_id, "count": len(events), "events": events})
    finally:
        cursor.close()
        conn.close()


@app.get("/students/<int:student_id>/events")
@auth_required("admin", "student")
def get_student_events_for_date(student_id):
    if g.current_user["role"] == "student" and g.current_user["user_id"] != student_id:
        return api_error("Students can only view their own events", 403)

    date_value = request.args.get("date")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                ce.event_id,
                ce.course_id,
                c.course_code,
                c.course_name,
                ce.title,
                ce.description,
                ce.start_datetime,
                ce.end_datetime
            FROM calendar_events ce
            JOIN courses c ON c.course_id = ce.course_id
            JOIN course_enrollments enr ON enr.course_id = ce.course_id
            WHERE enr.student_id = %s
        """
        params = [student_id]

        if date_value:
            query += " AND DATE(ce.start_datetime) = %s"
            params.append(date_value)

        query += " ORDER BY ce.start_datetime"
        events = fetch_all(cursor, query, tuple(params))
        return jsonify({"student_id": student_id, "date": date_value, "count": len(events), "events": events})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/forums")
@auth_required("admin", "lecturer")
def create_forum(course_id):
    data = get_json_body()
    validation = require_fields(data, ["title"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, course_id, g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can create forums for this course", 403)

        cursor.execute(
            """
            INSERT INTO forums (course_id, title, description, created_by)
            VALUES (%s, %s, %s, %s)
            """,
            (course_id, data["title"], data.get("description"), g.current_user["user_id"]),
        )
        conn.commit()
        return jsonify({"message": "Forum created successfully", "forum_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/forums")
@auth_required("admin", "lecturer", "student")
def get_course_forums(course_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        forums = fetch_all(
            cursor,
            """
            SELECT forum_id, title, description, created_by, created_at
            FROM forums
            WHERE course_id = %s
            ORDER BY created_at DESC
            """,
            (course_id,),
        )
        return jsonify({"course_id": course_id, "count": len(forums), "forums": forums})
    finally:
        cursor.close()
        conn.close()


@app.post("/forums/<int:forum_id>/threads")
@auth_required("admin", "lecturer", "student")
def create_thread(forum_id):
    data = get_json_body()
    validation = require_fields(data, ["title", "body"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        forum = fetch_one(cursor, "SELECT forum_id, course_id FROM forums WHERE forum_id = %s", (forum_id,))
        if not forum:
            return api_error("Forum not found", 404)

        if g.current_user["role"] == "student" and not is_course_student(cursor, forum["course_id"], g.current_user["user_id"]):
            return api_error("Student must be enrolled in the course to post", 403)
        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, forum["course_id"], g.current_user["user_id"]):
            return api_error("Lecturer must be assigned to the course to post", 403)

        cursor.execute(
            """
            INSERT INTO discussion_threads (forum_id, title, created_by)
            VALUES (%s, %s, %s)
            """,
            (forum_id, data["title"], g.current_user["user_id"]),
        )
        thread_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO thread_posts (thread_id, parent_post_id, user_id, body)
            VALUES (%s, NULL, %s, %s)
            """,
            (thread_id, g.current_user["user_id"], data["body"]),
        )
        conn.commit()
        return jsonify({"message": "Thread created successfully", "thread_id": thread_id}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/forums/<int:forum_id>/threads")
@auth_required("admin", "lecturer", "student")
def get_forum_threads(forum_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        forum = fetch_one(cursor, "SELECT forum_id, course_id FROM forums WHERE forum_id = %s", (forum_id,))
        if not forum:
            return api_error("Forum not found", 404)

        threads = fetch_all(
            cursor,
            """
            SELECT
                dt.thread_id,
                dt.title,
                dt.created_by,
                dt.created_at,
                (
                    SELECT tp.body
                    FROM thread_posts tp
                    WHERE tp.thread_id = dt.thread_id AND tp.parent_post_id IS NULL
                    ORDER BY tp.created_at
                    LIMIT 1
                ) AS starter_post
            FROM discussion_threads dt
            WHERE dt.forum_id = %s
            ORDER BY dt.created_at DESC
            """,
            (forum_id,),
        )
        return jsonify({"forum_id": forum_id, "count": len(threads), "threads": threads})
    finally:
        cursor.close()
        conn.close()


@app.post("/threads/<int:thread_id>/replies")
@auth_required("admin", "lecturer", "student")
def create_reply(thread_id):
    data = get_json_body()
    validation = require_fields(data, ["body"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        thread = fetch_one(
            cursor,
            """
            SELECT dt.thread_id, f.course_id
            FROM discussion_threads dt
            JOIN forums f ON f.forum_id = dt.forum_id
            WHERE dt.thread_id = %s
            """,
            (thread_id,),
        )
        if not thread:
            return api_error("Thread not found", 404)

        if g.current_user["role"] == "student" and not is_course_student(cursor, thread["course_id"], g.current_user["user_id"]):
            return api_error("Student must be enrolled in the course to reply", 403)
        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, thread["course_id"], g.current_user["user_id"]):
            return api_error("Lecturer must be assigned to the course to reply", 403)

        parent_post_id = data.get("parent_post_id")
        if parent_post_id:
            parent = fetch_one(
                cursor,
                "SELECT post_id FROM thread_posts WHERE post_id = %s AND thread_id = %s",
                (parent_post_id, thread_id),
            )
            if not parent:
                return api_error("Parent reply not found in this thread", 404)

        cursor.execute(
            """
            INSERT INTO thread_posts (thread_id, parent_post_id, user_id, body)
            VALUES (%s, %s, %s, %s)
            """,
            (thread_id, parent_post_id, g.current_user["user_id"], data["body"]),
        )
        conn.commit()
        return jsonify({"message": "Reply added successfully", "post_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/threads/<int:thread_id>/posts")
@auth_required("admin", "lecturer", "student")
def get_thread_posts(thread_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        thread = fetch_one(cursor, "SELECT thread_id FROM discussion_threads WHERE thread_id = %s", (thread_id,))
        if not thread:
            return api_error("Thread not found", 404)

        posts = fetch_all(
            cursor,
            """
            SELECT post_id, thread_id, parent_post_id, user_id, body, created_at
            FROM thread_posts
            WHERE thread_id = %s
            ORDER BY created_at, post_id
            """,
            (thread_id,),
        )
        return jsonify({"thread_id": thread_id, "count": len(posts), "posts": posts})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/sections")
@auth_required("admin", "lecturer")
def create_section(course_id):
    data = get_json_body()
    validation = require_fields(data, ["title", "position_no"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, course_id, g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can create sections", 403)

        cursor.execute(
            "INSERT INTO content_sections (course_id, title, position_no) VALUES (%s, %s, %s)",
            (course_id, data["title"], data["position_no"]),
        )
        conn.commit()
        return jsonify({"message": "Section created successfully", "section_id": cursor.lastrowid}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.post("/sections/<int:section_id>/content")
@auth_required("admin", "lecturer")
def add_course_content(section_id):
    data = get_json_body()
    validation = require_fields(data, ["title", "content_type"])
    if validation:
        return validation

    content_type = str(data["content_type"]).strip().lower()
    if content_type not in {"link", "file", "slide"}:
        return api_error("content_type must be link, file, or slide")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        section = fetch_one(
            cursor,
            "SELECT section_id, course_id FROM content_sections WHERE section_id = %s",
            (section_id,),
        )
        if not section:
            return api_error("Section not found", 404)

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, section["course_id"], g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can add content", 403)

        cursor.execute(
            """
            INSERT INTO course_contents
                (course_id, section_id, title, content_type, resource_url, file_reference, description, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                section["course_id"],
                section_id,
                data["title"],
                content_type,
                data.get("resource_url"),
                data.get("file_reference"),
                data.get("description"),
                g.current_user["user_id"],
            ),
        )
        conn.commit()
        return jsonify({"message": "Course content added successfully", "content_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.get("/courses/<int:course_id>/content")
@auth_required("admin", "lecturer", "student")
def get_course_content(course_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        content = fetch_all(
            cursor,
            """
            SELECT
                s.section_id,
                s.title AS section_title,
                s.position_no,
                cc.content_id,
                cc.title,
                cc.content_type,
                cc.resource_url,
                cc.file_reference,
                cc.description,
                cc.uploaded_by,
                cc.created_at
            FROM content_sections s
            LEFT JOIN course_contents cc ON cc.section_id = s.section_id
            WHERE s.course_id = %s
            ORDER BY s.position_no, cc.created_at
            """,
            (course_id,),
        )
        return jsonify({"course_id": course_id, "count": len(content), "content": content})
    finally:
        cursor.close()
        conn.close()


@app.post("/courses/<int:course_id>/assignments")
@auth_required("admin", "lecturer")
def create_assignment(course_id):
    data = get_json_body()
    validation = require_fields(data, ["title", "due_datetime"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        _, error = ensure_course_exists(cursor, course_id)
        if error:
            return error

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, course_id, g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can create assignments", 403)

        cursor.execute(
            """
            INSERT INTO assignments (course_id, title, description, due_datetime, max_score, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                course_id,
                data["title"],
                data.get("description"),
                data["due_datetime"],
                data.get("max_score", 100),
                g.current_user["user_id"],
            ),
        )
        conn.commit()
        invalidate_cache("reports:*")
        return jsonify({"message": "Assignment created successfully", "assignment_id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


@app.post("/assignments/<int:assignment_id>/submissions")
@auth_required("student")
def submit_assignment(assignment_id):
    data = get_json_body()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = fetch_one(
            cursor,
            "SELECT assignment_id, course_id FROM assignments WHERE assignment_id = %s",
            (assignment_id,),
        )
        if not assignment:
            return api_error("Assignment not found", 404)

        if not is_course_student(cursor, assignment["course_id"], g.current_user["user_id"]):
            return api_error("Student must be enrolled in the course to submit", 403)

        cursor.execute(
            """
            INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, submission_url)
            VALUES (%s, %s, %s, %s)
            """,
            (
                assignment_id,
                g.current_user["user_id"],
                data.get("submission_text"),
                data.get("submission_url"),
            ),
        )
        conn.commit()
        invalidate_cache("reports:*")
        return jsonify({"message": "Assignment submitted successfully", "submission_id": cursor.lastrowid}), 201
    except mysql.connector.Error as exc:
        conn.rollback()
        return api_error(str(exc), 400)
    finally:
        cursor.close()
        conn.close()


@app.post("/submissions/<int:submission_id>/grade")
@auth_required("admin", "lecturer")
def grade_submission(submission_id):
    data = get_json_body()
    validation = require_fields(data, ["score"])
    if validation:
        return validation

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        submission = fetch_one(
            cursor,
            """
            SELECT s.submission_id, s.assignment_id, s.student_id, a.course_id, a.max_score
            FROM assignment_submissions s
            JOIN assignments a ON a.assignment_id = s.assignment_id
            WHERE s.submission_id = %s
            """,
            (submission_id,),
        )
        if not submission:
            return api_error("Submission not found", 404)

        if float(data["score"]) > float(submission["max_score"]):
            return api_error("Score cannot be greater than max_score", 400)

        if g.current_user["role"] == "lecturer" and not is_course_lecturer(cursor, submission["course_id"], g.current_user["user_id"]):
            return api_error("Only the assigned lecturer can grade this submission", 403)

        existing_grade = fetch_one(
            cursor,
            "SELECT grade_id FROM assignment_grades WHERE submission_id = %s",
            (submission_id,),
        )

        if existing_grade:
            cursor.execute(
                """
                UPDATE assignment_grades
                SET graded_by = %s, score = %s, feedback = %s, graded_at = CURRENT_TIMESTAMP
                WHERE submission_id = %s
                """,
                (g.current_user["user_id"], data["score"], data.get("feedback"), submission_id),
            )
        else:
            cursor.execute(
                """
                INSERT INTO assignment_grades (submission_id, graded_by, score, feedback)
                VALUES (%s, %s, %s, %s)
                """,
                (submission_id, g.current_user["user_id"], data["score"], data.get("feedback")),
            )

        conn.commit()
        invalidate_cache("reports:*")
        return jsonify({"message": "Grade recorded successfully"}), 200
    finally:
        cursor.close()
        conn.close()


def get_view_data(view_name):
    cache_key = f"reports:{view_name}"
    cached = cache_get_json(cache_key)
    if cached is not None:
        return jsonify(cached)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        rows = fetch_all(cursor, f"SELECT * FROM {view_name}")
        payload = {"view": view_name, "count": len(rows), "results": rows}
        cache_set_json(cache_key, payload, ttl=300)
        return jsonify(payload)
    finally:
        cursor.close()
        conn.close()


@app.get("/reports/courses-50-plus")
@auth_required("admin")
def report_courses_50_plus():
    return get_view_data("v_courses_with_50_or_more_students")


@app.get("/reports/students-5-plus")
@auth_required("admin")
def report_students_5_plus():
    return get_view_data("v_students_with_5_or_more_courses")


@app.get("/reports/lecturers-3-plus")
@auth_required("admin")
def report_lecturers_3_plus():
    return get_view_data("v_lecturers_with_3_or_more_courses")


@app.get("/reports/top-10-courses")
@auth_required("admin")
def report_top_10_courses():
    return get_view_data("v_top_10_most_enrolled_courses")


@app.get("/reports/top-10-students")
@auth_required("admin")
def report_top_10_students():
    return get_view_data("v_top_10_students_overall_averages")


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", "5000")))
