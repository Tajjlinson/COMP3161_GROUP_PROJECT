-- ============================================================
-- COMP3161 Final Project - Calendar Events Schema
-- Branch: Calendar-Events
-- Run AFTER course_management.sql (Tajaun's schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
    event_id    INT AUTO_INCREMENT PRIMARY KEY,
    course_id   INT          NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    event_date  DATETIME     NOT NULL,
    created_by  INT          NOT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE INDEX idx_events_course_id  ON calendar_events(course_id);
CREATE INDEX idx_events_event_date ON calendar_events(event_date);
