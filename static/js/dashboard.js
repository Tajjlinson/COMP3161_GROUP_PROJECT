function renderCourses(courses) {
    const tbody = document.getElementById("courses-table-body");
    const count = document.getElementById("course-count");
    const badge = document.getElementById("course-badge");

    count.textContent = courses.length;
    badge.textContent = `${courses.length} loaded`;

    if (!courses.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted">No courses found.</td></tr>`;
        return;
    }

    tbody.innerHTML = courses.map((course) => `
        <tr>
            <td><strong>${escapeHtml(course.course_code)}</strong></td>
            <td>${escapeHtml(course.course_name)}</td>
            <td>
                <a class="btn btn-sm btn-outline-dark" href="/app/courses/${course.course_id}">Open</a>
            </td>
        </tr>
    `).join("");
}

async function loadCourses() {
    const role = window.APP_CONFIG.role;
    const userId = window.APP_CONFIG.userId;
    let endpoint = "/courses";

    if (role === "student") {
        endpoint = `/students/${userId}/courses`;
    } else if (role === "lecturer") {
        endpoint = `/lecturers/${userId}/courses`;
    }

    const payload = await apiRequest(endpoint);
    renderCourses(payload.courses || []);
}

async function loadReportPreview() {
    const preview = document.getElementById("report-preview");
    if (!preview) {
        return;
    }

    if (window.APP_CONFIG.role !== "admin") {
        preview.innerHTML = "Students and lecturers use course, forum, and calendar endpoints from the same API.";
        return;
    }

    const payload = await apiRequest("/reports/top-10-courses");
    const items = payload.results.slice(0, 5).map((item) =>
        `<li>${escapeHtml(item.course_code)} - ${escapeHtml(item.course_name)} <span class="text-muted">(${item.student_count} students)</span></li>`
    ).join("");
    preview.innerHTML = `<ol class="mb-0 ps-3">${items}</ol>`;
}

document.getElementById("create-course-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
        course_code: form.course_code.value,
        course_name: form.course_name.value,
        description: form.description.value
    };
    try {
        await apiRequest("/courses", {
            method: "POST",
            body: JSON.stringify(payload)
        });
        form.reset();
        await loadCourses();
        await loadReportPreview();
        alert("Course created successfully");
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById("student-enroll-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await apiRequest(`/courses/${form.course_id.value}/enroll`, {
            method: "POST",
            body: JSON.stringify({})
        });
        form.reset();
        await loadCourses();
        alert("Enrollment successful");
    } catch (error) {
        alert(error.message);
    }
});

(async function initDashboard() {
    try {
        await loadCourses();
        await loadReportPreview();
    } catch (error) {
        document.getElementById("courses-table-body").innerHTML =
            `<tr><td colspan="3" class="text-danger">${escapeHtml(error.message)}</td></tr>`;
        const preview = document.getElementById("report-preview");
        if (preview) {
            preview.textContent = error.message;
        }
    }
})();
