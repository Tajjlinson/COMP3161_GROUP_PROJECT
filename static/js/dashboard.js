// ============================================================================
// dashboard.js - Complete with Reports + Edit/Delete Modals
// ============================================================================

let allCoursesData = [];
let currentLecturerData = [];
let currentStudentData = [];

// ============================================================================
// REPORT CONFIGURATIONS
// ============================================================================

const reportConfig = {
    "courses-50-plus": {
        title: "Courses With 50 or More Students",
        description: "All courses with at least 50 enrolled students.",
        endpoint: "/reports/courses-50-plus",
        columns: [
            { key: "course_id", label: "Course ID" },
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "student_count", label: "Student Count" }
        ]
    },
    "students-5-plus": {
        title: "Students Doing 5 or More Courses",
        description: "Students enrolled in 5 or more courses.",
        endpoint: "/reports/students-5-plus",
        columns: [
            { key: "user_id", label: "Student ID" },
            { key: "user_code", label: "User Code" },
            { key: "full_name", label: "Full Name" },
            { key: "course_count", label: "Course Count" }
        ]
    },
    "lecturers-3-plus": {
        title: "Lecturers Teaching 3 or More Courses",
        description: "Lecturers assigned to 3 or more courses.",
        endpoint: "/reports/lecturers-3-plus",
        columns: [
            { key: "user_id", label: "Lecturer ID" },
            { key: "user_code", label: "User Code" },
            { key: "full_name", label: "Full Name" },
            { key: "course_count", label: "Course Count" }
        ]
    },
    "top-10-courses": {
        title: "Top 10 Most Enrolled Courses",
        description: "Courses ranked by enrollment count.",
        endpoint: "/reports/top-10-courses",
        columns: [
            { key: "course_id", label: "Course ID" },
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "student_count", label: "Student Count" }
        ]
    },
    "top-10-students": {
        title: "Top 10 Students By Overall Average",
        description: "Students ranked by their overall assignment average.",
        endpoint: "/reports/top-10-students",
        columns: [
            { key: "user_id", label: "Student ID" },
            { key: "user_code", label: "User Code" },
            { key: "full_name", label: "Full Name" },
            { key: "overall_average", label: "Overall Average" }
        ]
    }
};

const lecturerReportConfig = {
    "my-courses": {
        title: "My Courses",
        description: "Courses you are currently teaching.",
        endpoint: `/lecturers/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: (data) => data.courses || [],
        columns: [
            { key: "course_id", label: "Course ID" },
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" }
        ]
    },
    "course-enrollments": {
        title: "Course Enrollments",
        description: "Number of students enrolled in your courses.",
        endpoint: `/lecturers/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const enrollments = [];
            for (const course of courses) {
                try {
                    const members = await apiRequest(`/courses/${course.course_id}/members`);
                    const studentCount = members.members.filter(m => m.role === 'student').length;
                    enrollments.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        student_count: studentCount
                    });
                } catch (e) {
                    enrollments.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        student_count: 'Error loading'
                    });
                }
            }
            return enrollments;
        },
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "student_count", label: "Student Count" }
        ]
    }
};

const studentReportConfig = {
    "my-enrollments": {
        title: "My Enrollments",
        description: "Courses you are currently enrolled in.",
        endpoint: `/students/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: (data) => data.courses || [],
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" }
        ]
    },
    "my-grades": {
        title: "My Grades",
        description: "Your grades across all assignments.",
        endpoint: `/students/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const grades = [];
            for (const course of courses) {
                try {
                    const assignments = await apiRequest(`/courses/${course.course_id}/assignments`);
                    for (const assignment of assignments.assignments || []) {
                        grades.push({
                            course_code: course.course_code,
                            assignment_title: assignment.title,
                            due_date: assignment.due_datetime ? new Date(assignment.due_datetime).toLocaleDateString() : 'No date',
                            score: assignment.score !== null && assignment.score !== undefined ? assignment.score : 'Not graded',
                            max_score: assignment.max_score,
                            percentage: assignment.score ? ((assignment.score / assignment.max_score) * 100).toFixed(1) + '%' : 'N/A'
                        });
                    }
                } catch (e) {}
            }
            return grades;
        },
        columns: [
            { key: "course_code", label: "Course" },
            { key: "assignment_title", label: "Assignment" },
            { key: "due_date", label: "Due Date" },
            { key: "score", label: "Score" },
            { key: "max_score", label: "Max Score" },
            { key: "percentage", label: "Percentage" }
        ]
    }
};

// ============================================================================
// RENDER COURSES TABLE (with Edit/Delete for admin)
// ============================================================================

function renderCourses(courses) {
    const tbody = document.getElementById("courses-table-body");
    const count = document.getElementById("course-count");
    const badge = document.getElementById("course-badge");
    const role = window.APP_CONFIG?.role;

    if (!tbody) return;
    
    allCoursesData = courses;
    
    if (count) count.textContent = courses.length;
    if (badge) badge.textContent = `${courses.length} loaded`;

    if (!courses.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="cms-td-muted">No courses found.</td></tr>`;
        return;
    }

    tbody.innerHTML = courses.map((course) => {
        const isAdmin = role === "admin";
        return `
        <tr>
          <td><strong style="font-family:var(--mono);font-size:12px;color:var(--accent)">${escapeHtml(course.course_code)}</strong></td>
          <td>${escapeHtml(course.course_name)}</td>
          <td class="cms-muted" style="font-size:12px">${escapeHtml(course.description || '—')}</td>
          <td><span class="cms-badge">${course.student_count || 0}</span></td>
          <td>
            <div style="display: flex; gap: 6px;">
              <a class="cms-btn cms-btn-ghost cms-btn-sm" href="/app/courses/${course.course_id}" title="View Course">👁️</a>
              ${isAdmin ? `
                <button class="cms-btn cms-btn-ghost cms-btn-sm edit-course-btn" 
                    data-course-id="${course.course_id}" 
                    data-course-code="${escapeHtml(course.course_code)}" 
                    data-course-name="${escapeHtml(course.course_name)}" 
                    data-course-desc="${escapeHtml(course.description || '')}" 
                    title="Edit Course">✏️</button>
                <button class="cms-btn cms-btn-danger cms-btn-sm delete-course-btn" 
                    data-course-id="${course.course_id}" 
                    data-course-code="${escapeHtml(course.course_code)}" 
                    title="Delete Course">🗑️</button>
              ` : ''}
            </div>
           </td>
         </tr>
        `;
    }).join("");
    
    if (role === "admin") {
        document.querySelectorAll('.edit-course-btn').forEach(btn => {
            btn.removeEventListener('click', handleEditClick);
            btn.addEventListener('click', handleEditClick);
        });
        document.querySelectorAll('.delete-course-btn').forEach(btn => {
            btn.removeEventListener('click', handleDeleteClick);
            btn.addEventListener('click', handleDeleteClick);
        });
    }
}

// ============================================================================
// EDIT/DELETE HANDLERS
// ============================================================================

function handleEditClick(event) {
    event.stopPropagation();
    const btn = event.currentTarget;
    showEditCourseModal({
        courseId: btn.dataset.courseId,
        courseCode: btn.dataset.courseCode,
        courseName: btn.dataset.courseName,
        courseDesc: btn.dataset.courseDesc
    });
}

function handleDeleteClick(event) {
    event.stopPropagation();
    confirmDeleteCourse(event.currentTarget.dataset.courseId, event.currentTarget.dataset.courseCode);
}

function showEditCourseModal(courseData) {
    let modal = document.getElementById('editCourseModal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'editCourseModal';
    modal.className = 'cms-modal';
    modal.innerHTML = `
        <div class="cms-modal-content" style="width: 500px; max-width: 90%; border-radius: 12px;">
            <div class="cms-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border);">
                <h3 style="margin: 0;">✏️ Edit Course</h3>
                <button class="cms-modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div class="cms-modal-body" style="padding: 20px;">
                <form id="edit-course-form">
                    <div class="cms-field" style="margin-bottom: 16px;">
                        <label class="cms-label">Course Code</label>
                        <input class="cms-input" type="text" id="edit-course-code" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;" required>
                    </div>
                    <div class="cms-field" style="margin-bottom: 16px;">
                        <label class="cms-label">Course Name</label>
                        <input class="cms-input" type="text" id="edit-course-name" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;" required>
                    </div>
                    <div class="cms-field" style="margin-bottom: 16px;">
                        <label class="cms-label">Description</label>
                        <textarea class="cms-textarea" id="edit-course-desc" rows="3" style="width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px;"></textarea>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="cms-btn cms-btn-ghost cancel-edit-btn">Cancel</button>
                        <button type="submit" class="cms-btn cms-btn-primary">💾 Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('edit-course-code').value = courseData.courseCode;
    document.getElementById('edit-course-name').value = courseData.courseName;
    document.getElementById('edit-course-desc').value = courseData.courseDesc || '';
    
    modal.querySelector('.cms-modal-close').onclick = () => modal.remove();
    modal.querySelector('.cancel-edit-btn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    document.getElementById('edit-course-form').onsubmit = async (e) => {
        e.preventDefault();
        const saveBtn = e.target.querySelector('button[type="submit"]');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            const response = await fetch(`/courses/${courseData.courseId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.APP_CONFIG.token}` },
                body: JSON.stringify({
                    course_code: document.getElementById('edit-course-code').value,
                    course_name: document.getElementById('edit-course-name').value,
                    description: document.getElementById('edit-course-desc').value
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert('✅ Course updated successfully!');
            modal.remove();
            await loadCourses();
            await loadReportPreview();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    };
}

async function confirmDeleteCourse(courseId, courseCode) {
    if (!confirm(`⚠️ Delete "${courseCode}"? This cannot be undone!`)) return;
    try {
        const response = await fetch(`/courses/${courseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${window.APP_CONFIG.token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        alert(result.message);
        await loadCourses();
        await loadReportPreview();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// ============================================================================
// LOAD COURSES - SUPER FAST (Single API call)
// ============================================================================

async function loadCourses() {
    const role = window.APP_CONFIG?.role;
    const userId = window.APP_CONFIG?.userId;
    let endpoint = "/courses";

    if (role === "student") {
        endpoint = `/students/${userId}/courses`;
    } else if (role === "lecturer") {
        endpoint = `/lecturers/${userId}/courses`;
    }

    try {
        const payload = await apiRequest(endpoint);
        const courses = payload.courses || [];
        
        // Student counts are ALREADY in the data for admin (from SQL)
        // No extra API calls needed!
        renderCourses(courses);
        
    } catch (error) {
        console.error('Error loading courses:', error);
        const tbody = document.getElementById("courses-table-body");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="color: var(--red);">Error loading courses: ${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

// ============================================================================
// REPORT FUNCTIONS
// ============================================================================

async function loadReportPreview() {
    const preview = document.getElementById("report-preview");
    if (!preview) return;

    const role = window.APP_CONFIG?.role;
    if (role !== "admin") {
        preview.innerHTML = role === "student" ? "📚 View your grades in Student Reports below." : "📊 Track your courses in Lecturer Reports below.";
        return;
    }

    try {
        const payload = await apiRequest("/reports/top-10-courses");
        const items = (payload.results || []).slice(0, 5).map(item => 
            `<li style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">
                <span style="font-family:monospace;color:var(--accent)">${escapeHtml(item.course_code)}</span>
                — ${escapeHtml(item.course_name)} (${item.student_count} students)
            </li>`
        ).join("");
        preview.innerHTML = `<ul style="list-style:none;padding:0;margin:0">${items}</ul>`;
    } catch { preview.innerHTML = "Unable to load preview."; }
}

async function loadReport(reportKey) {
    const config = reportConfig[reportKey];
    if (!config) return;
    const payload = await apiRequest(config.endpoint);
    renderReportTable(reportKey, payload.results || []);
}

function renderReportTable(reportKey, rows) {
    const config = reportConfig[reportKey];
    const head = document.getElementById("report-table-head");
    const body = document.getElementById("report-table-body");
    const title = document.getElementById("report-title");
    const description = document.getElementById("report-description");
    const badge = document.getElementById("report-count-badge");

    if (!config || !head || !body) return;

    if (title) title.textContent = config.title;
    if (description) description.textContent = config.description;
    if (badge) badge.textContent = `${rows.length} rows`;
    
    window.currentReportData = rows;

    head.innerHTML = `<tr>${config.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr>`;
    body.innerHTML = rows.length ? rows.map(row => `<tr>${config.columns.map(col => `<td>${escapeHtml(row[col.key] ?? "")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No data</td></tr>`;
}

async function loadLecturerReport(reportKey) {
    const config = lecturerReportConfig[reportKey];
    if (!config) return;
    
    const head = document.getElementById("lecturer-report-table-head");
    const body = document.getElementById("lecturer-report-table-body");
    const title = document.getElementById("lecturer-report-title");
    const description = document.getElementById("lecturer-report-description");
    const badge = document.getElementById("lecturer-report-count-badge");

    if (!head || !body) return;
    if (title) title.textContent = config.title;
    if (description) description.textContent = config.description;

    try {
        const data = await apiRequest(config.endpoint);
        const rows = await config.transform(data);
        currentLecturerData = rows;
        if (badge) badge.textContent = `${rows.length} rows`;
        head.innerHTML = `<tr>${config.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr>`;
        body.innerHTML = rows.length ? rows.map(row => `<tr>${config.columns.map(col => `<td>${escapeHtml(row[col.key] ?? "")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No data</td></tr>`;
    } catch (error) {
        body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">Error: ${escapeHtml(error.message)}</td></tr>`;
    }
}

async function loadStudentReport(reportKey) {
    const config = studentReportConfig[reportKey];
    if (!config) return;
    
    const head = document.getElementById("student-report-table-head");
    const body = document.getElementById("student-report-table-body");
    const title = document.getElementById("student-report-title");
    const description = document.getElementById("student-report-description");
    const badge = document.getElementById("student-report-count-badge");

    if (!head || !body) return;
    if (title) title.textContent = config.title;
    if (description) description.textContent = config.description;

    try {
        const data = await apiRequest(config.endpoint);
        const rows = await config.transform(data);
        currentStudentData = rows;
        if (badge) badge.textContent = `${rows.length} rows`;
        head.innerHTML = `<tr>${config.columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr>`;
        body.innerHTML = rows.length ? rows.map(row => `<tr>${config.columns.map(col => `<td>${escapeHtml(row[col.key] ?? "")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No data</td></tr>`;
    } catch (error) {
        body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">Error: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ============================================================================
// TAB BINDING
// ============================================================================

function bindReportTabs() {
    const tabs = document.querySelectorAll("#report-tabs .cms-rtab");
    tabs.forEach(tab => {
        tab.removeEventListener('click', () => {});
        tab.addEventListener("click", async () => {
            tabs.forEach(t => t.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");
            await loadReport(tab.dataset.report);
        });
    });
}

function bindLecturerReportTabs() {
    const tabs = document.querySelectorAll("#lecturer-report-tabs .cms-rtab");
    tabs.forEach(tab => {
        tab.removeEventListener('click', () => {});
        tab.addEventListener("click", async () => {
            tabs.forEach(t => t.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");
            await loadLecturerReport(tab.dataset.report);
        });
    });
}

function bindStudentReportTabs() {
    const tabs = document.querySelectorAll("#student-report-tabs .cms-rtab");
    tabs.forEach(tab => {
        tab.removeEventListener('click', () => {});
        tab.addEventListener("click", async () => {
            tabs.forEach(t => t.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");
            await loadStudentReport(tab.dataset.report);
        });
    });
}

// ============================================================================
// FORM HANDLERS
// ============================================================================

function bindFormHandlers() {
    document.getElementById("refresh-dashboard-btn")?.addEventListener("click", async () => {
        await loadCourses();
        await loadReportPreview();
        if (window.APP_CONFIG?.role === "admin") await loadReport("courses-50-plus");
        else if (window.APP_CONFIG?.role === "lecturer") await loadLecturerReport("my-courses");
        else if (window.APP_CONFIG?.role === "student") await loadStudentReport("my-enrollments");
        alert("Dashboard refreshed");
    });
    
    document.getElementById("courses-search")?.addEventListener("input", () => {
        const term = document.getElementById("courses-search").value.toLowerCase();
        const filtered = allCoursesData.filter(c => c.course_code.toLowerCase().includes(term) || c.course_name.toLowerCase().includes(term));
        if (window.APP_CONFIG?.role === "admin") renderCourses(filtered);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Add modal styles
if (!document.getElementById('modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `.cms-modal{display:flex;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.5);justify-content:center;align-items:center}.cms-modal-content{background:#fff;border-radius:12px;animation:modalFadeIn 0.2s}@keyframes modalFadeIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
}

(async function initDashboard() {
    bindFormHandlers();
    bindReportTabs();
    bindLecturerReportTabs();
    bindStudentReportTabs();
    
    await loadCourses();
    await loadReportPreview();
    
    if (window.APP_CONFIG?.role === "admin") await loadReport("courses-50-plus");
    else if (window.APP_CONFIG?.role === "lecturer") await loadLecturerReport("my-courses");
    else if (window.APP_CONFIG?.role === "student") await loadStudentReport("my-enrollments");
})();