// dashboard.js — Complete file with role-specific reports

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

// ==================== LECTURER REPORTS ====================

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
            { key: "course_id", label: "Course ID" },
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "student_count", label: "Student Count" }
        ]
    },
    "submission-summary": {
        title: "Submission Summary",
        description: "Assignment submission rates across your courses.",
        endpoint: `/lecturers/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const summary = [];
            for (const course of courses) {
                try {
                    const assignments = await apiRequest(`/courses/${course.course_id}/assignments`);
                    const members = await apiRequest(`/courses/${course.course_id}/members`);
                    const students = members.members.filter(m => m.role === 'student');
                    
                    let totalSubmissions = 0;
                    let totalAssignments = 0;
                    for (const assignment of assignments.assignments || []) {
                        totalAssignments++;
                        try {
                            const submissions = await apiRequest(`/assignments/${assignment.assignment_id}/submissions`);
                            totalSubmissions += (submissions.submissions || []).length;
                        } catch (e) {
                            // Skip if can't load submissions
                        }
                    }
                    
                    summary.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        total_students: students.length,
                        total_assignments: totalAssignments,
                        total_submissions: totalSubmissions,
                        submission_rate: students.length && totalAssignments ? ((totalSubmissions / (totalAssignments * students.length)) * 100).toFixed(1) + '%' : '0%'
                    });
                } catch (e) {
                    summary.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        total_students: 'Error',
                        total_assignments: 'Error',
                        total_submissions: 'Error',
                        submission_rate: 'Error'
                    });
                }
            }
            return summary;
        },
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "total_students", label: "Students" },
            { key: "total_assignments", label: "Assignments" },
            { key: "total_submissions", label: "Submissions" },
            { key: "submission_rate", label: "Submission Rate" }
        ]
    },
    "grade-distribution": {
        title: "Grade Distribution",
        description: "Average grades across your assignments.",
        endpoint: `/lecturers/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const distribution = [];
            for (const course of courses) {
                try {
                    const assignments = await apiRequest(`/courses/${course.course_id}/assignments`);
                    let totalScore = 0;
                    let totalMaxScore = 0;
                    let gradedCount = 0;
                    
                    for (const assignment of assignments.assignments || []) {
                        try {
                            const submissions = await apiRequest(`/assignments/${assignment.assignment_id}/submissions`);
                            for (const sub of submissions.submissions || []) {
                                if (sub.score !== null && sub.score !== undefined) {
                                    totalScore += sub.score;
                                    totalMaxScore += assignment.max_score;
                                    gradedCount++;
                                }
                            }
                        } catch (e) {
                            // Skip if can't load submissions
                        }
                    }
                    
                    distribution.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        graded_submissions: gradedCount,
                        average_score: gradedCount ? (totalScore / gradedCount).toFixed(1) : 'N/A',
                        average_percentage: totalMaxScore ? ((totalScore / totalMaxScore) * 100).toFixed(1) + '%' : 'N/A'
                    });
                } catch (e) {
                    distribution.push({
                        course_id: course.course_id,
                        course_code: course.course_code,
                        course_name: course.course_name,
                        graded_submissions: 'Error',
                        average_score: 'Error',
                        average_percentage: 'Error'
                    });
                }
            }
            return distribution;
        },
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "graded_submissions", label: "Graded Submissions" },
            { key: "average_score", label: "Average Score" },
            { key: "average_percentage", label: "Average %" }
        ]
    }
};

// ==================== STUDENT REPORTS ====================

const studentReportConfig = {
    "my-enrollments": {
        title: "My Enrollments",
        description: "Courses you are currently enrolled in.",
        endpoint: `/students/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: (data) => data.courses || [],
        columns: [
            { key: "course_id", label: "Course ID" },
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
                            course_name: course.course_name,
                            assignment_title: assignment.title,
                            due_date: assignment.due_datetime ? new Date(assignment.due_datetime).toLocaleDateString() : 'No date',
                            score: assignment.score !== null && assignment.score !== undefined ? assignment.score : 'Not graded',
                            max_score: assignment.max_score,
                            percentage: assignment.score ? ((assignment.score / assignment.max_score) * 100).toFixed(1) + '%' : 'N/A'
                        });
                    }
                } catch (e) {
                    // Skip if can't load
                }
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
    },
    "assignment-progress": {
        title: "Assignment Progress",
        description: "Your submission status for assignments.",
        endpoint: `/students/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const progress = [];
            for (const course of courses) {
                try {
                    const assignments = await apiRequest(`/courses/${course.course_id}/assignments`);
                    let submitted = 0;
                    let total = 0;
                    for (const assignment of assignments.assignments || []) {
                        total++;
                        if (assignment.submission_id) submitted++;
                    }
                    progress.push({
                        course_code: course.course_code,
                        course_name: course.course_name,
                        total_assignments: total,
                        submitted: submitted,
                        pending: total - submitted,
                        completion_rate: total ? ((submitted / total) * 100).toFixed(1) + '%' : '0%'
                    });
                } catch (e) {
                    progress.push({
                        course_code: course.course_code,
                        course_name: course.course_name,
                        total_assignments: 'Error',
                        submitted: 'Error',
                        pending: 'Error',
                        completion_rate: 'Error'
                    });
                }
            }
            return progress;
        },
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "total_assignments", label: "Total" },
            { key: "submitted", label: "Submitted" },
            { key: "pending", label: "Pending" },
            { key: "completion_rate", label: "Completion Rate" }
        ]
    },
    "course-averages": {
        title: "Course Averages",
        description: "Your overall performance in each course.",
        endpoint: `/students/${window.APP_CONFIG?.userId || ''}/courses`,
        transform: async (data) => {
            const courses = data.courses || [];
            const averages = [];
            for (const course of courses) {
                try {
                    const assignments = await apiRequest(`/courses/${course.course_id}/assignments`);
                    let totalScore = 0;
                    let totalMax = 0;
                    let gradedCount = 0;
                    for (const assignment of assignments.assignments || []) {
                        if (assignment.score !== null && assignment.score !== undefined) {
                            totalScore += assignment.score;
                            totalMax += assignment.max_score;
                            gradedCount++;
                        }
                    }
                    averages.push({
                        course_code: course.course_code,
                        course_name: course.course_name,
                        graded_assignments: gradedCount,
                        total_score: totalScore.toFixed(1),
                        total_possible: totalMax,
                        overall_percentage: totalMax ? ((totalScore / totalMax) * 100).toFixed(1) + '%' : 'N/A'
                    });
                } catch (e) {
                    averages.push({
                        course_code: course.course_code,
                        course_name: course.course_name,
                        graded_assignments: 'Error',
                        total_score: 'Error',
                        total_possible: 'Error',
                        overall_percentage: 'Error'
                    });
                }
            }
            return averages;
        },
        columns: [
            { key: "course_code", label: "Course Code" },
            { key: "course_name", label: "Course Name" },
            { key: "graded_assignments", label: "Graded" },
            { key: "total_score", label: "Your Score" },
            { key: "total_possible", label: "Possible" },
            { key: "overall_percentage", label: "Overall %" }
        ]
    }
};

// ==================== RENDERING FUNCTIONS ====================

function renderCourses(courses) {
    const tbody = document.getElementById("courses-table-body");
    const count = document.getElementById("course-count");
    const badge = document.getElementById("course-badge");

    if (!tbody) return;
    
    count.textContent = courses.length;
    badge.textContent = `${courses.length} loaded`;

    if (!courses.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="cms-td-muted">No courses found.</td></tr>`;
        return;
    }

    tbody.innerHTML = courses.map((course) => `
        <tr>
            <td><strong style="font-family:var(--mono);font-size:12px;color:var(--accent)">${escapeHtml(course.course_code)}</strong></td>
            <td>${escapeHtml(course.course_name)}</td>
            <td>
                <a class="cms-btn cms-btn-ghost cms-btn-sm" href="/app/courses/${course.course_id}">Open →</a>
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
    if (!preview) return;

    if (window.APP_CONFIG.role !== "admin") {
        const role = window.APP_CONFIG.role;
        if (role === "student") {
            preview.innerHTML = `<span class="text-muted">📚 View your grades and assignment progress in the Student Reports section below.</span>`;
        } else if (role === "lecturer") {
            preview.innerHTML = `<span class="text-muted">📊 Track your course performance and student submissions in the Lecturer Reports section below.</span>`;
        } else {
            preview.innerHTML = `<span class="text-muted">Students and lecturers access course, forum, assignment, content, and calendar endpoints via the same API.</span>`;
        }
        return;
    }

    const payload = await apiRequest("/reports/top-10-courses");
    const items = (payload.results || []).slice(0, 5).map((item) =>
        `<li style="padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">
            <span style="font-family:var(--mono);font-size:11.5px;color:var(--accent)">${escapeHtml(item.course_code)}</span>
            — ${escapeHtml(item.course_name)}
            <span class="text-muted">(${item.student_count} students)</span>
        </li>`
    ).join("");
    preview.innerHTML = `<ul style="list-style:none;padding:0;margin:0">${items}</ul>`;
}

function renderReportTable(reportKey, rows) {
    const config = reportConfig[reportKey];
    const head = document.getElementById("report-table-head");
    const body = document.getElementById("report-table-body");
    const title = document.getElementById("report-title");
    const description = document.getElementById("report-description");
    const badge = document.getElementById("report-count-badge");

    if (!config || !head || !body || !title || !description || !badge) return;

    title.textContent = config.title;
    description.textContent = config.description;
    badge.textContent = `${rows.length} rows`;
    
    window.currentReportData = rows;

    head.innerHTML = `<tr>${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>`;

    if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No rows returned for this report.</td></tr>`;
        return;
    }

    body.innerHTML = rows.map((row) => `
        <tr>${config.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>
    `).join("");
}

// ==================== LECTURER REPORT RENDERING ====================

let currentLecturerData = [];

async function loadLecturerReport(reportKey) {
    const config = lecturerReportConfig[reportKey];
    if (!config) return;
    
    const head = document.getElementById("lecturer-report-table-head");
    const body = document.getElementById("lecturer-report-table-body");
    const title = document.getElementById("lecturer-report-title");
    const description = document.getElementById("lecturer-report-description");
    const badge = document.getElementById("lecturer-report-count-badge");

    if (!head || !body) return;

    title.textContent = config.title;
    description.textContent = config.description;

    try {
        const data = await apiRequest(config.endpoint);
        let rows = await config.transform(data);
        currentLecturerData = rows;
        
        badge.textContent = `${rows.length} rows`;
        
        head.innerHTML = `<tr>${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>`;
        
        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No data available.</td></tr>`;
            return;
        }
        
        body.innerHTML = rows.map((row) => `
            <tr>${config.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>
        `).join("");
    } catch (error) {
        body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">Error loading report: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ==================== STUDENT REPORT RENDERING ====================

let currentStudentData = [];

async function loadStudentReport(reportKey) {
    const config = studentReportConfig[reportKey];
    if (!config) return;
    
    const head = document.getElementById("student-report-table-head");
    const body = document.getElementById("student-report-table-body");
    const title = document.getElementById("student-report-title");
    const description = document.getElementById("student-report-description");
    const badge = document.getElementById("student-report-count-badge");

    if (!head || !body) return;

    title.textContent = config.title;
    description.textContent = config.description;

    try {
        const data = await apiRequest(config.endpoint);
        let rows = await config.transform(data);
        currentStudentData = rows;
        
        badge.textContent = `${rows.length} rows`;
        
        head.innerHTML = `<tr>${config.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>`;
        
        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">No data available.</td></tr>`;
            return;
        }
        
        body.innerHTML = rows.map((row) => `
            <tr>${config.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>
        `).join("");
    } catch (error) {
        body.innerHTML = `<tr><td colspan="${config.columns.length}" class="cms-td-muted">Error loading report: ${escapeHtml(error.message)}</td></tr>`;
    }
}

async function loadReport(reportKey) {
    const config = reportConfig[reportKey];
    if (!config) return;
    const payload = await apiRequest(config.endpoint);
    renderReportTable(reportKey, payload.results || []);
}

// ==================== CSV DOWNLOAD FUNCTIONS ====================

function downloadCSV(data, filename) {
    if (!data || !data.length) {
        alert("No data to download");
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            let value = row[header] || '';
            if (typeof value === 'string') {
                value = value.replace(/"/g, '""');
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportCoursesToCSV() {
    const courses = [];
    document.querySelectorAll('#courses-table-body tr').forEach(tr => {
        if (tr.querySelector('.cms-td-muted')) return;
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 2) {
            courses.push({
                'Course Code': cells[0]?.textContent.trim() || '',
                'Course Name': cells[1]?.textContent.trim() || ''
            });
        }
    });
    
    if (courses.length) {
        downloadCSV(courses, `courses_${new Date().toISOString().split('T')[0]}`);
    } else {
        alert("No courses to export");
    }
}

async function exportAllReports() {
    if (window.APP_CONFIG.role !== "admin") {
        alert("Only administrators can export all reports");
        return;
    }
    
    const allData = {};
    for (const [key, config] of Object.entries(reportConfig)) {
        try {
            const payload = await apiRequest(config.endpoint);
            allData[key] = {
                title: config.title,
                data: payload.results || []
            };
        } catch (error) {
            allData[key] = {
                title: config.title,
                data: [],
                error: error.message
            };
        }
    }
    
    let exportContent = "";
    for (const [key, report] of Object.entries(allData)) {
        exportContent += `\n\n=== ${report.title} ===\n\n`;
        if (report.error) {
            exportContent += `Error: ${report.error}\n`;
        } else if (report.data.length) {
            const headers = Object.keys(report.data[0]);
            exportContent += headers.join(',') + '\n';
            for (const row of report.data) {
                const values = headers.map(header => {
                    let value = row[header] || '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                exportContent += values.join(',') + '\n';
            }
        } else {
            exportContent += "No data available\n";
        }
    }
    
    const blob = new Blob([exportContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `all_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportLecturerReports() {
    if (currentLecturerData.length) {
        downloadCSV(currentLecturerData, `lecturer_report_${new Date().toISOString().split('T')[0]}`);
    } else {
        alert("No data to export");
    }
}

function exportStudentReports() {
    if (currentStudentData.length) {
        downloadCSV(currentStudentData, `student_report_${new Date().toISOString().split('T')[0]}`);
    } else {
        alert("No data to export");
    }
}

// ==================== TAB BINDING ====================

function bindReportTabs() {
    const tabs = document.querySelectorAll("#report-tabs button");
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            tabs.forEach((button) => button.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");

            const body = document.getElementById("report-table-body");
            if (body) body.innerHTML = `<tr><td class="cms-td-muted">Loading report…</td></tr>`;

            try {
                await loadReport(tab.dataset.report);
            } catch (error) {
                if (body) body.innerHTML = `<tr><td class="text-danger">${escapeHtml(error.message)}</td></tr>`;
            }
        });
    });
}

function bindLecturerReportTabs() {
    const tabs = document.querySelectorAll("#lecturer-report-tabs button");
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            tabs.forEach((button) => button.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");

            const body = document.getElementById("lecturer-report-table-body");
            if (body) body.innerHTML = `<tr><td class="cms-td-muted">Loading report…</td></tr>`;

            try {
                await loadLecturerReport(tab.dataset.report);
            } catch (error) {
                if (body) body.innerHTML = `<tr><td class="text-danger">${escapeHtml(error.message)}</td></tr>`;
            }
        });
    });
}

function bindStudentReportTabs() {
    const tabs = document.querySelectorAll("#student-report-tabs button");
    if (!tabs.length) return;

    tabs.forEach((tab) => {
        tab.addEventListener("click", async () => {
            tabs.forEach((button) => button.classList.remove("cms-rtab-active"));
            tab.classList.add("cms-rtab-active");

            const body = document.getElementById("student-report-table-body");
            if (body) body.innerHTML = `<tr><td class="cms-td-muted">Loading report…</td></tr>`;

            try {
                await loadStudentReport(tab.dataset.report);
            } catch (error) {
                if (body) body.innerHTML = `<tr><td class="text-danger">${escapeHtml(error.message)}</td></tr>`;
            }
        });
    });
}

// ==================== FORM HANDLERS ====================

function bindFormHandlers() {
    document.getElementById("refresh-dashboard-btn")?.addEventListener("click", async () => {
        try {
            await loadCourses();
            await loadReportPreview();
            if (window.APP_CONFIG.role === "admin") {
                await loadReport("courses-50-plus");
            } else if (window.APP_CONFIG.role === "lecturer") {
                await loadLecturerReport("my-courses");
            } else if (window.APP_CONFIG.role === "student") {
                await loadStudentReport("my-enrollments");
            }
            alert("Dashboard refreshed successfully");
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById("export-courses-btn")?.addEventListener("click", exportCoursesToCSV);
    document.getElementById("export-all-reports-btn")?.addEventListener("click", exportAllReports);
    document.getElementById("download-report-btn")?.addEventListener("click", () => {
        if (window.currentReportData) {
            downloadCSV(window.currentReportData, `report_${new Date().toISOString().split('T')[0]}`);
        } else {
            alert("No report data available");
        }
    });
    
    document.getElementById("export-lecturer-all-btn")?.addEventListener("click", exportLecturerReports);
    document.getElementById("download-lecturer-report-btn")?.addEventListener("click", exportLecturerReports);
    document.getElementById("export-student-all-btn")?.addEventListener("click", exportStudentReports);
    document.getElementById("download-student-report-btn")?.addEventListener("click", exportStudentReports);
}

// ==================== LOOKUP HANDLERS ====================

function renderLookupCourses(title, courses) {
    const container = document.getElementById("lookup-results");
    if (!container) return;

    if (!courses.length) {
        container.innerHTML = `<span class="text-muted">${escapeHtml(title)}: no courses found.</span>`;
        return;
    }

    container.innerHTML = `
        <p style="font-size:12px;font-weight:600;margin-bottom:10px">${escapeHtml(title)}</p>
        <div class="stack-list">
            ${courses.map((course) => `
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
}

function renderStudentEvents(events, studentId, date) {
    const container = document.getElementById("student-events-results");
    if (!container) return;

    if (!events.length) {
        container.innerHTML = `<span class="text-muted">No events found for student ${escapeHtml(studentId)} on ${escapeHtml(date)}.</span>`;
        return;
    }

    container.innerHTML = `
        <p style="font-size:12px;font-weight:600;margin-bottom:10px">Events for student ${escapeHtml(studentId)} on ${escapeHtml(date)}</p>
        <div class="stack-list">
            ${events.map((event) => `
                <div class="sub-card">
                    <div style="font-weight:500;font-size:13px">${escapeHtml(event.title)}</div>
                    <div class="text-muted" style="font-size:12px">${escapeHtml(event.course_code)} — ${escapeHtml(event.course_name)}</div>
                    <div style="font-size:12px;margin-top:4px">${escapeHtml(event.start_datetime)}${event.end_datetime ? ` → ${escapeHtml(event.end_datetime)}` : ""}</div>
                </div>
            `).join("")}
        </div>
    `;
}

// ==================== INITIALIZATION ====================

(async function initDashboard() {
    // Wait for APP_CONFIG to be ready
    if (!window.APP_CONFIG) {
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (window.APP_CONFIG) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    
    bindFormHandlers();
    bindReportTabs();
    
    try {
        await loadCourses();
        await loadReportPreview();
        
        if (window.APP_CONFIG.role === "admin") {
            bindReportTabs();
            await loadReport("courses-50-plus");
        } else if (window.APP_CONFIG.role === "lecturer") {
            bindLecturerReportTabs();
            await loadLecturerReport("my-courses");
        } else if (window.APP_CONFIG.role === "student") {
            bindStudentReportTabs();
            await loadStudentReport("my-enrollments");
        }
        
        // Show export buttons
        const exportButtons = ['export-courses-btn', 'export-preview-btn', 'export-lookup-results-btn', 'export-events-results-btn'];
        exportButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'inline-flex';
        });
        
    } catch (error) {
        const tbody = document.getElementById("courses-table-body");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="3" style="color:#c62828">${escapeHtml(error.message)}</td></tr>`;
        }
        const preview = document.getElementById("report-preview");
        if (preview) {
            preview.textContent = error.message;
        }
    }
})();

// Keep existing form handlers from original file
document.getElementById("student-course-lookup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        const payload = await apiRequest(`/students/${form.student_id.value}/courses`);
        renderLookupCourses(`Courses for student ${form.student_id.value}`, payload.courses || []);
    } catch (error) {
        document.getElementById("lookup-results").innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
    }
});

document.getElementById("lecturer-course-lookup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        const payload = await apiRequest(`/lecturers/${form.lecturer_id.value}/courses`);
        renderLookupCourses(`Courses for lecturer ${form.lecturer_id.value}`, payload.courses || []);
    } catch (error) {
        document.getElementById("lookup-results").innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
    }
});

document.getElementById("student-events-lookup-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        const payload = await apiRequest(`/students/${form.student_id.value}/events?date=${encodeURIComponent(form.date.value)}`);
        renderStudentEvents(payload.events || [], form.student_id.value, form.date.value);
    } catch (error) {
        document.getElementById("student-events-results").innerHTML = `<span class="text-danger">${escapeHtml(error.message)}</span>`;
    }
});

document.getElementById("assign-lecturer-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await apiRequest(`/courses/${form.course_id.value}/lecturer`, {
            method: "POST",
            body: JSON.stringify({ lecturer_id: Number(form.lecturer_id.value) })
        });
        form.reset();
        alert("Lecturer assigned successfully");
    } catch (error) {
        alert(error.message);
    }
});

document.getElementById("create-course-form")?.addEventListener("submit", async (event) => {
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
        await loadCourses();
        await loadReportPreview();
        if (window.APP_CONFIG.role === "admin") {
            await loadReport("courses-50-plus");
        }
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