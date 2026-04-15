# ============================================================
# COMP3161 Final Project - Calendar Events Module
# Branch: Calendar-Events
# ============================================================

from flask import Blueprint, request, jsonify
import mysql.connector
import os

calendar_bp = Blueprint('calendar', __name__)

def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Bz2pfzwzqnk3",
        database="comp3161_db"
    )


# ============================================================
# POST /events
# Create a calendar event for a course
# Body: { "course_id": 1, "title": "Midterm", "description": "...", "event_date": "2025-10-13 09:00:00", "created_by": 1 }
# ============================================================
@calendar_bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()

    required = ['course_id', 'title', 'event_date', 'created_by']
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    course_id   = data['course_id']
    title       = data['title']
    description = data.get('description', '')
    event_date  = data['event_date']
    created_by  = data['created_by']

    db  = get_db()
    cur = db.cursor(dictionary=True)

    try:
        # Check course exists
        cur.execute("SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not cur.fetchone():
            return jsonify({"error": f"Course {course_id} does not exist"}), 404

        cur.execute("""
            INSERT INTO calendar_events (course_id, title, description, event_date, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (course_id, title, description, event_date, created_by))

        db.commit()

        return jsonify({
            "message":  "Calendar event created successfully",
            "event_id": cur.lastrowid
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        db.close()


# ============================================================
# GET /events/course/<course_id>
# Get all events for a specific course
# Example: GET /events/course/1
# ============================================================
@calendar_bp.route('/events/course/<int:course_id>', methods=['GET'])
def get_events_by_course(course_id):
    db  = get_db()
    cur = db.cursor(dictionary=True)

    try:
        # Check course exists
        cur.execute("SELECT course_id FROM courses WHERE course_id = %s", (course_id,))
        if not cur.fetchone():
            return jsonify({"error": f"Course {course_id} does not exist"}), 404

        cur.execute("""
            SELECT
                ce.event_id,
                ce.course_id,
                c.course_name,
                ce.title,
                ce.description,
                ce.event_date,
                ce.created_by,
                ce.created_at
            FROM calendar_events ce
            JOIN courses c ON ce.course_id = c.course_id
            WHERE ce.course_id = %s
            ORDER BY ce.event_date ASC
        """, (course_id,))

        events = cur.fetchall()

        for e in events:
            if e.get('event_date'): e['event_date'] = str(e['event_date'])
            if e.get('created_at'): e['created_at'] = str(e['created_at'])

        return jsonify({
            "course_id": course_id,
            "count":     len(events),
            "events":    events
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        db.close()


# ============================================================
# GET /events/student/<student_id>?date=YYYY-MM-DD
# Get all events for a student across all their enrolled courses
# The ?date= param is optional — omit to get all events
# Example: GET /events/student/100?date=2025-10-13
# ============================================================
@calendar_bp.route('/events/student/<int:student_id>', methods=['GET'])
def get_events_by_student(student_id):
    date_filter = request.args.get('date')

    db  = get_db()
    cur = db.cursor(dictionary=True)

    try:
        query = """
            SELECT
                ce.event_id,
                ce.course_id,
                c.course_name,
                ce.title,
                ce.description,
                ce.event_date,
                ce.created_at
            FROM calendar_events ce
            JOIN courses            c  ON ce.course_id = c.course_id
            JOIN course_enrollments en ON en.course_id = c.course_id
            WHERE en.student_id = %s
        """
        params = [student_id]

        if date_filter:
            query  += " AND DATE(ce.event_date) = %s"
            params.append(date_filter)

        query += " ORDER BY ce.event_date ASC"

        cur.execute(query, tuple(params))
        events = cur.fetchall()

        for e in events:
            if e.get('event_date'): e['event_date'] = str(e['event_date'])
            if e.get('created_at'): e['created_at'] = str(e['created_at'])

        return jsonify({
            "student_id":  student_id,
            "date_filter": date_filter or "all dates",
            "count":       len(events),
            "events":      events
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        db.close()
