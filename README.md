# COMP3161 Course Management System

This project now includes a complete raw-SQL backend structure for the COMP3161 final project requirements. The original repository had partial modules for authentication, courses, calendar events, and forums; this version adds a consolidated implementation that covers the full assignment scope.

## Main Deliverables

- `complete_schema.sql`
  Normalized MySQL schema, constraints, and required reporting views.
- `seed_data.sql`
  SQL-only data generation script for admins, lecturers, 100,000 students, 200 courses, enrollments, assignments, submissions, grades, forums, threads, content, and events.
- `complete_course_management_api.py`
  Flask REST API using raw SQL only. No ORM is used.
- `ERD.md`
  Mermaid ERD that matches the schema and can be exported into the PDF deliverable.
- `course_management_complete_postman.json`
  Postman collection covering the main assignment endpoints.
- `templates/` and `static/`
  Frontend application reusing the Trackademia-style layout for login, dashboard, and course views.
- `Dockerfile`, `render.yaml`, `.github/workflows/ci.yml`
  Bonus-section deployment and CI/CD assets.

## Core Features Covered

- User registration and login
- Role-based access for admin, lecturer, and student
- Course creation and retrieval
- Lecturer assignment and student enrollment
- Course member retrieval
- Calendar event creation and retrieval
- Forums, threads, and nested replies
- Course sections and course content
- Assignments, submissions, and grading
- Report endpoints backed by SQL views

## Setup

1. Create a MySQL database, for example `comp3161_db`.
2. Run `complete_schema.sql`.
3. Run `seed_data.sql`.
4. Set environment variables:

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="comp3161_db"
$env:APP_SECRET="replace_this_for_production"
```

5. Start the API:

```powershell
python complete_course_management_api.py
```

## Notes

- Passwords are stored as hashes in the consolidated API.
- Authentication uses a signed bearer token built with Flask's `itsdangerous` dependency.
- The frontend signs users in and then calls the API using bearer tokens from the same Flask app.
- Redis-compatible caching is optional and activates automatically when `REDIS_URL` is set.
- The Render blueprint deploys the web app and a Redis-compatible Key Value cache. Database variables are left configurable so you can point the app to your MySQL instance.
- The older partial files are still present for reference, but the consolidated deliverables above are the ones aligned to the assignment brief.
