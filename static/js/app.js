// ============================================================================
// app.js - Complete with all helper functions and event listeners
// ============================================================================

async function apiRequest(url, options = {}) {
    const headers = Object.assign(
        {
            "Content-Type": "application/json"
        },
        options.headers || {}
    );

    if (window.APP_CONFIG && window.APP_CONFIG.token) {
        headers.Authorization = `Bearer ${window.APP_CONFIG.token}`;
    }

    // Don't set Content-Type for FormData
    if (options.body && options.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    const response = await fetch(url, Object.assign({}, options, { headers }));
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload.error || "Request failed");
    }

    return payload;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Wait for DOM to be ready before binding events
document.addEventListener('DOMContentLoaded', function() {
    // Student course lookup form
    const studentLookupForm = document.getElementById("student-course-lookup-form");
    if (studentLookupForm) {
        studentLookupForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const studentId = form.student_id.value;
            const resultsDiv = document.getElementById("lookup-results");
            try {
                const payload = await apiRequest(`/students/${studentId}/courses`);
                if (resultsDiv) {
                    if (payload.courses && payload.courses.length) {
                        resultsDiv.innerHTML = `
                            <p style="font-size:12px;font-weight:600;margin-bottom:10px">Courses for student ${escapeHtml(studentId)}</p>
                            <div class="stack-list">
                                ${payload.courses.map((course) => `
                                    <div class="sub-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                                        <div>
                                            <div style="font-weight:600;font-size:13px;font-family:var(--mono);color:var(--accent)">${escapeHtml(course.course_code)}</div>
                                            <div class="text-muted" style="font-size:12px">${escapeHtml(course.course_name)}</div>
                                        </div>
                                        <a class="cms-btn cms-btn-ghost cms-btn-sm" href="/app/courses/${course.course_id}">Open →</a>
                                    </div>
                                `).join("")}
                            </div>
                        `;
                    } else {
                        resultsDiv.innerHTML = `<span class="text-muted">No courses found for student ${escapeHtml(studentId)}.</span>`;
                    }
                }
            } catch (error) {
                if (resultsDiv) resultsDiv.innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
            }
        });
    }

    // Lecturer course lookup form
    const lecturerLookupForm = document.getElementById("lecturer-course-lookup-form");
    if (lecturerLookupForm) {
        lecturerLookupForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const lecturerId = form.lecturer_id.value;
            const resultsDiv = document.getElementById("lookup-results");
            try {
                const payload = await apiRequest(`/lecturers/${lecturerId}/courses`);
                if (resultsDiv) {
                    if (payload.courses && payload.courses.length) {
                        resultsDiv.innerHTML = `
                            <p style="font-size:12px;font-weight:600;margin-bottom:10px">Courses for lecturer ${escapeHtml(lecturerId)}</p>
                            <div class="stack-list">
                                ${payload.courses.map((course) => `
                                    <div class="sub-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                                        <div>
                                            <div style="font-weight:600;font-size:13px;font-family:var(--mono);color:var(--accent)">${escapeHtml(course.course_code)}</div>
                                            <div class="text-muted" style="font-size:12px">${escapeHtml(course.course_name)}</div>
                                        </div>
                                        <a class="cms-btn cms-btn-ghost cms-btn-sm" href="/app/courses/${course.course_id}">Open →</a>
                                    </div>
                                `).join("")}
                            </div>
                        `;
                    } else {
                        resultsDiv.innerHTML = `<span class="text-muted">No courses found for lecturer ${escapeHtml(lecturerId)}.</span>`;
                    }
                }
            } catch (error) {
                if (resultsDiv) resultsDiv.innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
            }
        });
    }

    // Student events lookup form
    const studentEventsForm = document.getElementById("student-events-lookup-form");
    if (studentEventsForm) {
        studentEventsForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const studentId = form.student_id.value;
            const date = form.date.value;
            const resultsDiv = document.getElementById("student-events-results");
            try {
                const payload = await apiRequest(`/students/${studentId}/events?date=${encodeURIComponent(date)}`);
                if (resultsDiv) {
                    if (payload.events && payload.events.length) {
                        resultsDiv.innerHTML = `
                            <p style="font-size:12px;font-weight:600;margin-bottom:10px">Events for student ${escapeHtml(studentId)} on ${escapeHtml(date)}</p>
                            <div class="stack-list">
                                ${payload.events.map((event) => `
                                    <div class="sub-card">
                                        <div style="font-weight:500;font-size:13px">${escapeHtml(event.title)}</div>
                                        <div class="text-muted" style="font-size:12px">${escapeHtml(event.course_code)} — ${escapeHtml(event.course_name)}</div>
                                        <div style="font-size:12px;margin-top:4px">${escapeHtml(event.start_datetime)}${event.end_datetime ? ` → ${escapeHtml(event.end_datetime)}` : ""}</div>
                                    </div>
                                `).join("")}
                            </div>
                        `;
                    } else {
                        resultsDiv.innerHTML = `<span class="text-muted">No events found for student ${escapeHtml(studentId)} on ${escapeHtml(date)}.</span>`;
                    }
                }
            } catch (error) {
                if (resultsDiv) resultsDiv.innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
            }
        });
    }

    // Assign lecturer form
    const assignLecturerForm = document.getElementById("assign-lecturer-form");
    if (assignLecturerForm) {
        assignLecturerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const courseId = form.course_id.value;
            const lecturerId = form.lecturer_id.value;
            try {
                await apiRequest(`/courses/${courseId}/lecturer`, {
                    method: "POST",
                    body: JSON.stringify({ lecturer_id: Number(lecturerId) })
                });
                form.reset();
                alert("Lecturer assigned successfully");
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Create course form
    const createCourseForm = document.getElementById("create-course-form");
    if (createCourseForm) {
        createCourseForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const payload = {
                course_code: form.course_code.value,
                course_name: form.course_name.value,
                description: form.description.value
            };
            try {
                await apiRequest("/courses", { method: "POST", body: JSON.stringify(payload) });
                form.reset();
                alert("Course created successfully");
                // Refresh page to show new course
                window.location.reload();
            } catch (error) {
                alert(error.message);
            }
        });
    }

    // Student enroll form
    const studentEnrollForm = document.getElementById("student-enroll-form");
    if (studentEnrollForm) {
        studentEnrollForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const courseId = form.course_id.value;
            try {
                await apiRequest(`/courses/${courseId}/enroll`, {
                    method: "POST",
                    body: JSON.stringify({})
                });
                form.reset();
                alert("Enrollment successful");
                window.location.reload();
            } catch (error) {
                alert(error.message);
            }
        });
    }
});