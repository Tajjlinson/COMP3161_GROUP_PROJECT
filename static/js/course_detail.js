// course_detail.js — unchanged logic; only tab switching updated for new CSS class names

const courseState = {
    course: null,
    members: [],
    events: [],
    forums: [],
    content: [],
    assignments: [],
    selectedForumId: null,
    threads: [],
    selectedThreadId: null,
    threadPosts: [],
    selectedContent: null,
    selectedAssignmentId: null,
    assignmentSubmissions: []
};

function formatDateTime(value) {
    if (!value) return "Not set";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : parsed.toLocaleString();
}

function toApiDateTime(localValue) {
    return localValue ? `${localValue.replace("T", " ")}:00`.replace(":00:00", ":00") : null;
}

function escapeAttribute(value) {
    return String(value ?? "").replace(/"/g, "&quot;");
}

function updateCounters() {
    document.getElementById("members-count").textContent = courseState.members.length;
    document.getElementById("events-count").textContent = courseState.events.length;
    document.getElementById("assignments-count").textContent = courseState.assignments.length;
    document.getElementById("content-count").textContent = courseState.content.filter((item) => item.content_id).length;

    const students = courseState.members.filter((m) => m.role === "student").length;
    const lecturers = courseState.members.filter((m) => m.role === "lecturer").length;
    document.getElementById("member-role-summary").textContent = `${students} students, ${lecturers} lecturer${lecturers === 1 ? "" : "s"}`;
}

function renderMembers() {
    const list = document.getElementById("members-list");
    if (!courseState.members.length) {
        list.innerHTML = `<li class="cms-member-item cms-muted">No members found.</li>`;
        return;
    }
    list.innerHTML = courseState.members.map((member) => `
        <li class="cms-member-item">
            <div class="cms-member-avatar">${escapeHtml(member.full_name[0] || "?")}</div>
            <div style="flex:1;min-width:0">
                <div style="font-weight:500;font-size:13px">${escapeHtml(member.full_name)}</div>
                <div style="font-size:11.5px;color:var(--text-3);font-family:var(--mono)">${escapeHtml(member.user_code)}</div>
            </div>
            <span class="cms-role-badge cms-role-${escapeHtml(member.role)}">${escapeHtml(member.role)}</span>
        </li>
    `).join("");
}

function renderEvents() {
    const list = document.getElementById("events-list");
    if (!courseState.events.length) {
        list.innerHTML = `<li class="cms-list-item cms-muted">No events found.</li>`;
        return;
    }
    list.innerHTML = courseState.events.map((event) => `
        <li class="cms-list-item" style="border-left:3px solid var(--accent);padding-left:14px">
            <div class="cms-list-item-title">${escapeHtml(event.title)}</div>
            <div class="cms-list-item-sub">${formatDateTime(event.start_datetime)}${event.end_datetime ? ` → ${formatDateTime(event.end_datetime)}` : ""}</div>
            <div style="font-size:12px;margin-top:4px;color:var(--text-2)">${escapeHtml(event.description || "No description")}</div>
        </li>
    `).join("");
}

function buildSectionMap() {
    const sections = new Map();
    courseState.content.forEach((row) => {
        if (!sections.has(row.section_id)) {
            sections.set(row.section_id, {
                section_id: row.section_id,
                section_title: row.section_title,
                position_no: row.position_no,
                items: []
            });
        }
        if (row.content_id) {
            sections.get(row.section_id).items.push(row);
        }
    });
    return [...sections.values()].sort((a, b) => a.position_no - b.position_no);
}

function getContentResource(item) {
    if (item.resource_url) return item.resource_url;
    if (item.file_url) return item.file_url;
    if (item.file_reference) return `/uploads/${item.file_reference.split("/").map(encodeURIComponent).join("/")}`;
    return null;
}

function getContentDownloadResource(item) {
    if (item.download_url) return item.download_url;
    return getContentResource(item);
}

function isPreviewableUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".txt", ".html", ".htm"].some((ext) => lower.includes(ext));
}

function renderContentPreview(item) {
    const shell = document.getElementById("content-preview-shell");
    const title = document.getElementById("content-preview-title");
    const subtitle = document.getElementById("content-preview-subtitle");
    if (!shell || !title || !subtitle) return;

    if (!item) {
        title.textContent = "Select content to preview";
        subtitle.textContent = "Links, images, PDFs, and embeddable pages can be previewed here.";
        shell.innerHTML = `<p class="cms-muted" style="font-size:13px">Choose a content item from the list above to preview or download it.</p>`;
        return;
    }

    const resource = getContentResource(item);
    const downloadResource = getContentDownloadResource(item);
    title.textContent = item.title || "Content Preview";
    subtitle.textContent = `${item.section_title || "Course content"} · ${item.content_type}`;

    const actions = resource ? `
        <div class="content-actions">
            <a class="cms-btn cms-btn-primary cms-btn-sm" href="${escapeHtml(resource)}" target="_blank" rel="noreferrer">Open ↗</a>
            <a class="cms-btn cms-btn-ghost cms-btn-sm" href="${escapeHtml(downloadResource)}">Download</a>
        </div>
    ` : `<p class="cms-muted" style="font-size:12.5px;margin-bottom:10px">No file or URL is attached to this content item.</p>`;

    if (!resource) {
        shell.innerHTML = `${actions}<div style="font-size:12.5px;color:var(--text-2)">${escapeHtml(item.description || "No description")}</div>`;
        return;
    }

    const lower = resource.toLowerCase();
    let previewHtml = `<div class="cms-muted" style="font-size:12.5px;margin-top:10px">Preview unavailable for this file type. Use Open or Download above.</div>`;

    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].some((ext) => lower.includes(ext))) {
        previewHtml = `<img src="${escapeHtml(resource)}" alt="${escapeHtml(item.title)}" style="max-width:100%;border-radius:var(--r-sm);margin-top:10px;border:1px solid var(--border)">`;
    } else if (lower.includes(".pdf") || isPreviewableUrl(resource) || item.content_type === "link") {
        previewHtml = `<iframe class="preview-frame" src="${escapeHtml(resource)}" title="content preview"></iframe>`;
    }

    shell.innerHTML = `
        ${actions}
        <div style="font-size:12.5px;color:var(--text-2);margin-bottom:8px">${escapeHtml(item.description || "No description")}</div>
        ${previewHtml}
    `;
}

function renderGeneratedUrlResult(targetId, payload, label) {
    const container = document.getElementById(targetId);
    if (!container) return;

    const previewUrl = payload.file_url || null;
    const downloadUrl = payload.download_url || null;

    if (!previewUrl && !downloadUrl) {
        container.classList.add("d-none");
        container.innerHTML = "";
        return;
    }

    container.classList.remove("d-none");
    container.innerHTML = `
        <div style="font-weight:600;font-size:12.5px;margin-bottom:10px">${escapeHtml(label)}</div>
        ${previewUrl ? `
            <div class="small text-muted" style="margin-bottom:4px">Preview URL</div>
            <code class="result-code">${escapeHtml(previewUrl)}</code>
            <div class="content-actions">
                <a class="cms-btn cms-btn-primary cms-btn-sm" href="${escapeAttribute(previewUrl)}" target="_blank" rel="noreferrer">Open ↗</a>
                <button class="cms-btn cms-btn-ghost cms-btn-sm copy-url-btn" type="button" data-url="${escapeAttribute(previewUrl)}">Copy Preview URL</button>
            </div>
        ` : ""}
        ${downloadUrl ? `
            <div class="small text-muted" style="margin-bottom:4px;margin-top:8px">Download URL</div>
            <code class="result-code">${escapeHtml(downloadUrl)}</code>
            <div class="content-actions">
                <a class="cms-btn cms-btn-ghost cms-btn-sm" href="${escapeAttribute(downloadUrl)}">Download</a>
                <button class="cms-btn cms-btn-ghost cms-btn-sm copy-url-btn" type="button" data-url="${escapeAttribute(downloadUrl)}">Copy Download URL</button>
            </div>
        ` : ""}
    `;

    container.querySelectorAll(".copy-url-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.url);
                button.textContent = "Copied!";
                setTimeout(() => {
                    button.textContent = button.dataset.url === previewUrl ? "Copy Preview URL" : "Copy Download URL";
                }, 1200);
            } catch {
                alert("Unable to copy URL automatically. Copy it from the box above.");
            }
        });
    });
}

function populateContentEditor(item) {
    const title = document.getElementById("selected-content-editor-title");
    const form = document.getElementById("edit-content-form");
    if (!title || !form) return;

    if (!item) {
        title.textContent = "Select a content item to edit";
        form.reset();
        document.getElementById("edit-content-id").value = "";
        return;
    }

    title.textContent = `Editing: ${item.title}`;
    document.getElementById("edit-content-id").value = item.content_id || "";
    form.title.value = item.title || "";
    form.content_type.value = item.content_type || "slide";
    form.resource_url.value = item.resource_url || "";
    form.file_reference.value = item.file_reference || "";
    form.description.value = item.description || "";
}

function renderSectionsSelect() {
    const select = document.getElementById("section-select");
    if (!select) return;
    const sections = buildSectionMap();
    select.innerHTML = `<option value="">Select section</option>` + sections.map((section) => `
        <option value="${section.section_id}">${escapeHtml(section.section_title)} (Position ${section.position_no})</option>
    `).join("");
}

function renderContent() {
    const container = document.getElementById("content-list");
    const sections = buildSectionMap();
    if (!sections.length) {
        container.innerHTML = `<div class="cms-muted">No sections or content found.</div>`;
        populateContentEditor(null);
        return;
    }

    const allItems = sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, section_title: section.section_title }))
    );
    if (courseState.selectedContent && !allItems.some((item) => item.content_id === courseState.selectedContent.content_id)) {
        courseState.selectedContent = null;
    }

    const typeIcon = { slide: "🖼", link: "🔗", file: "📄" };

    container.innerHTML = sections.map((section) => {
        const itemsHtml = section.items.length ? `
            <div style="padding:6px 8px;display:flex;flex-direction:column;gap:4px">
                ${section.items.map((item) => {
                    const resource = getContentResource(item);
                    const download = getContentDownloadResource(item);
                    const isSelected = courseState.selectedContent && courseState.selectedContent.content_id === item.content_id;
                    return `
                    <div class="content-item-row${isSelected ? " content-item-row-active" : ""}" data-content-id="${item.content_id}">
                        <div class="content-item-left">
                            <span class="content-type-icon">${typeIcon[item.content_type] || "•"}</span>
                            <div class="content-item-info">
                                <div class="content-item-title">${escapeHtml(item.title)}</div>
                                ${item.description ? `<div class="content-item-desc">${escapeHtml(item.description)}</div>` : ""}
                            </div>
                        </div>
                        <div class="content-item-actions">
                            ${resource
                                ? `<a class="cms-btn cms-btn-primary cms-btn-sm" href="${escapeHtml(resource)}" target="_blank" rel="noreferrer">
                                       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                       Open
                                   </a>
                                   <a class="cms-btn cms-btn-ghost cms-btn-sm" href="${escapeHtml(download)}" download>
                                       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                       Download
                                   </a>`
                                : `<span class="cms-badge cms-badge-amber">No file</span>`
                            }
                        </div>
                    </div>`;
                }).join("")}
            </div>
        ` : `<div style="padding:12px 16px;font-size:12.5px;color:var(--text-3)">No content posted in this section yet.</div>`;

        return `
        <div class="content-card">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-bottom:1px solid var(--border)">
                <span style="font-weight:600;font-size:13px">${escapeHtml(section.section_title)}</span>
                <span class="cms-badge">Position ${section.position_no}</span>
            </div>
            ${itemsHtml}
        </div>`;
    }).join("");

    // Clicking the row info area selects it for the edit form (links handle themselves)
    document.querySelectorAll("[data-content-id]").forEach((row) => {
        row.addEventListener("click", (e) => {
            if (e.target.closest("a")) return;
            const selected = allItems.find((item) => item.content_id === Number(row.dataset.contentId));
            if (selected) {
                courseState.selectedContent = selected;
                renderContent();
            }
        });
    });

    populateContentEditor(courseState.selectedContent);
}

function renderAssignments() {
    const container = document.getElementById("assignments-list");
    const summary = document.getElementById("assignment-summary-text");
    if (!courseState.assignments.length) {
        container.innerHTML = `<div class="asgn-list-empty">No assignments yet.</div>`;
        if (summary) summary.textContent = "No assignments have been created for this course yet.";
        return;
    }

    const role = window.APP_CONFIG.role;
    if (!courseState.selectedAssignmentId) {
        courseState.selectedAssignmentId = courseState.assignments[0].assignment_id;
    }
    if (!courseState.assignments.some((a) => a.assignment_id === courseState.selectedAssignmentId)) {
        courseState.selectedAssignmentId = courseState.assignments[0].assignment_id;
    }

    if (summary) {
        if (role === "student") {
            const graded = courseState.assignments.filter((a) => a.score !== null && a.score !== undefined);
            const avg = graded.length
                ? (graded.reduce((t, a) => t + ((Number(a.score) / Number(a.max_score)) * 100), 0) / graded.length).toFixed(1)
                : null;
            summary.textContent = avg
                ? `Overall average: ${avg}% across ${graded.length} graded assignment(s).`
                : "Grades posted here contribute to your overall average.";
        } else {
            summary.textContent = "Select an assignment to review submissions and post grades.";
        }
    }

    // Status helpers
    function statusBadge(a) {
        if (role !== "student") {
            const due = new Date(a.due_datetime);
            const isPast = due < new Date();
            return isPast
                ? `<span class="asgn-badge asgn-badge-muted">Closed</span>`
                : `<span class="asgn-badge asgn-badge-green">Open</span>`;
        }
        if (a.score !== null && a.score !== undefined) {
            const pct = Math.round((Number(a.score) / Number(a.max_score)) * 100);
            return `<span class="asgn-badge asgn-badge-green">${pct}%</span>`;
        }
        if (a.submission_id) return `<span class="asgn-badge asgn-badge-accent">Submitted</span>`;
        const due = new Date(a.due_datetime);
        if (due < new Date()) return `<span class="asgn-badge asgn-badge-red">Overdue</span>`;
        return `<span class="asgn-badge asgn-badge-amber">Pending</span>`;
    }

    container.innerHTML = courseState.assignments.map((a) => `
        <button class="asgn-list-item ${a.assignment_id === courseState.selectedAssignmentId ? "active" : ""}"
                type="button" data-assignment-id="${a.assignment_id}">
            <div class="asgn-list-item-top">
                <span class="asgn-list-title">${escapeHtml(a.title)}</span>
                ${statusBadge(a)}
            </div>
            <div class="asgn-list-meta">Due ${formatDateTime(a.due_datetime)}</div>
        </button>
    `).join("");

    document.querySelectorAll(".asgn-list-item").forEach((btn) => {
        btn.addEventListener("click", async () => {
            courseState.selectedAssignmentId = Number(btn.dataset.assignmentId);
            renderAssignments();
            renderAssignmentDetail();
            await loadAssignmentSubmissions();
        });
    });

    renderAssignmentDetail();
}

function renderAssignmentDetail() {
    const panel = document.getElementById("asgn-detail-panel");
    if (!panel) return;

    const role = window.APP_CONFIG.role;
    const a = courseState.assignments.find((x) => x.assignment_id === courseState.selectedAssignmentId);
    if (!a) {
        panel.className = "asgn-detail-empty";
        panel.innerHTML = `
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" style="color:var(--text-3)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <p>Select an assignment</p>
            <p class="cms-hint">Details and submissions will appear here</p>`;
        return;
    }

    panel.className = "asgn-detail-body";

    // Grade bar calculation
    const submissions = courseState.assignmentSubmissions || [];
    const graded = submissions.filter((s) => s.score !== null && s.score !== undefined);
    const avgScore = graded.length
        ? (graded.reduce((t, s) => t + Number(s.score), 0) / graded.length).toFixed(1)
        : null;
    const gradePct = avgScore ? ((avgScore / a.max_score) * 100).toFixed(0) : 0;

    panel.innerHTML = `
        <!-- Assignment header -->
        <div class="asgn-detail-header">
            <div>
                <h3 class="asgn-detail-title">${escapeHtml(a.title)}</h3>
                <p class="asgn-detail-meta">Due ${formatDateTime(a.due_datetime)} &nbsp;·&nbsp; Max score: ${escapeHtml(String(a.max_score))}</p>
            </div>
            ${role !== "student" ? `<span class="cms-badge" style="font-size:10.5px">ID #${a.assignment_id}</span>` : ""}
        </div>
        ${a.description ? `<p class="asgn-detail-desc">${escapeHtml(a.description)}</p>` : ""}

        ${role !== "student" && submissions.length ? `
        <!-- Grade stats bar -->
        <div class="asgn-stats-row">
            <div class="asgn-stat">
                <span class="asgn-stat-val">${submissions.length}</span>
                <span class="asgn-stat-lbl">Submissions</span>
            </div>
            <div class="asgn-stat">
                <span class="asgn-stat-val">${graded.length}</span>
                <span class="asgn-stat-lbl">Graded</span>
            </div>
            <div class="asgn-stat">
                <span class="asgn-stat-val">${avgScore ?? "—"}</span>
                <span class="asgn-stat-lbl">Avg score</span>
            </div>
            <div class="asgn-stat asgn-stat-bar-wrap">
                <div class="asgn-grade-bar">
                    <div class="asgn-grade-fill" style="width:${gradePct}%"></div>
                </div>
                <span class="asgn-stat-lbl">${gradePct}% of max</span>
            </div>
        </div>
        ` : ""}

        ${role === "student" ? `
        <!-- Student: own submission status -->
        <div class="asgn-own-status">
            <div class="asgn-own-status-row">
                <span class="asgn-own-label">Status</span>
                ${a.submission_id
                    ? `<span class="asgn-badge asgn-badge-accent">Submitted ${formatDateTime(a.submitted_at)}</span>`
                    : `<span class="asgn-badge asgn-badge-amber">Not submitted</span>`}
            </div>
            <div class="asgn-own-status-row">
                <span class="asgn-own-label">Grade</span>
                ${a.score !== null && a.score !== undefined
                    ? `<span class="asgn-badge asgn-badge-green" style="font-size:13px">${escapeHtml(String(a.score))} / ${escapeHtml(String(a.max_score))}</span>`
                    : `<span class="asgn-badge asgn-badge-muted">Not graded yet</span>`}
            </div>
            ${a.feedback ? `
            <div class="asgn-own-status-row">
                <span class="asgn-own-label">Feedback</span>
                <span style="font-size:13px;color:var(--text)">${escapeHtml(a.feedback)}</span>
            </div>` : ""}
            ${a.submission_url ? `
            <div class="asgn-own-status-row">
                <span class="asgn-own-label">File</span>
                <a href="${escapeHtml(a.submission_url)}" target="_blank" rel="noreferrer" class="cms-btn cms-btn-ghost cms-btn-sm">Open submitted file ↗</a>
            </div>` : ""}
        </div>
        <!-- Submit form -->
        <div class="asgn-section-label">Submit Assignment</div>
        <form class="submit-assignment-form asgn-submit-form" data-assignment-id="${a.assignment_id}" enctype="multipart/form-data">
            <div class="cms-form-row">
                <div class="cms-field">
                    <label class="cms-label">Submission URL</label>
                    <input class="cms-input" name="submission_url" placeholder="Optional link">
                </div>
                <div class="cms-field">
                    <label class="cms-label">Upload File</label>
                    <input class="cms-file-input" type="file" name="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.zip">
                </div>
            </div>
            <div class="cms-field">
                <label class="cms-label">Comment</label>
                <textarea class="cms-textarea" name="submission_text" rows="2" placeholder="Notes about your submission\u2026"></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end">
                <button class="cms-btn cms-btn-primary cms-btn-sm" type="submit">Submit Assignment</button>
            </div>
        </form>
        ` : `
        <!-- Lecturer/admin: submissions table -->
        <div class="asgn-section-label">Student Submissions</div>
        <div id="asgn-submissions-inner">
            <div class="cms-muted" style="font-size:13px">Loading submissions\u2026</div>
        </div>
        `}
    `;

    // Wire up student submit form
    panel.querySelector(".submit-assignment-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const assignmentId = form.dataset.assignmentId;
        try {
            const payload = new FormData();
            payload.append("submission_url", form.submission_url.value);
            payload.append("submission_text", form.submission_text.value);
            if (form.file.files[0]) payload.append("file", form.file.files[0]);
            const headers = {};
            if (window.APP_CONFIG?.token) headers.Authorization = `Bearer ${window.APP_CONFIG.token}`;
            const response = await fetch(`/assignments/${assignmentId}/submissions`, { method: "POST", headers, body: payload });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Unable to submit assignment");
            alert("Assignment submitted successfully");
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });
}

function renderForums() {
    const container = document.getElementById("forums-list");
    if (!courseState.forums.length) {
        container.innerHTML = `<div class="cms-muted">No forums found.</div>`;
        document.getElementById("selected-forum-title").textContent = "Select a forum";
        document.getElementById("selected-forum-subtitle").textContent = "Thread details will appear here.";
        return;
    }

    if (!courseState.selectedForumId) {
        courseState.selectedForumId = courseState.forums[0].forum_id;
    }

    container.innerHTML = courseState.forums.map((forum) => `
        <button class="chat-forum-item ${forum.forum_id === courseState.selectedForumId ? "active" : ""}" type="button" data-forum-id="${forum.forum_id}">
            <span class="chat-forum-dot"></span>
            <span style="min-width:0">
                <span class="chat-forum-name">${escapeHtml(forum.title)}</span>
                <span class="chat-forum-desc">${escapeHtml(forum.description || "")}</span>
            </span>
        </button>
    `).join("");

    const selectedForum = courseState.forums.find((f) => f.forum_id === courseState.selectedForumId);
    document.getElementById("selected-forum-title").textContent = selectedForum ? selectedForum.title : "Threads";
    document.getElementById("selected-forum-subtitle").textContent = selectedForum ? (selectedForum.description || "No description") : "Select a forum";
    document.getElementById("thread-forum-id").value = selectedForum ? selectedForum.forum_id : "";

    document.querySelectorAll("[data-forum-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            courseState.selectedForumId = Number(button.dataset.forumId);
            courseState.selectedThreadId = null;
            renderForums();
            await loadThreads();
        });
    });
}

function renderThreads() {
    const container = document.getElementById("threads-list");
    if (!courseState.selectedForumId) {
        container.innerHTML = `<div class="chat-empty-sm">Select a forum.</div>`;
        return;
    }
    if (!courseState.threads.length) {
        container.innerHTML = `<div class="chat-empty-sm">No threads yet. Create one above.</div>`;
        document.getElementById("selected-thread-title").textContent = "Messages";
        return;
    }

    if (!courseState.selectedThreadId) {
        courseState.selectedThreadId = courseState.threads[0].thread_id;
    }

    container.innerHTML = courseState.threads.map((thread) => `
        <button class="chat-thread-item ${thread.thread_id === courseState.selectedThreadId ? "active" : ""}" type="button" data-thread-id="${thread.thread_id}">
            <div class="chat-thread-title">${escapeHtml(thread.title)}</div>
            <div class="chat-thread-preview">${escapeHtml(thread.starter_post || "")}</div>
        </button>
    `).join("");

    const selectedThread = courseState.threads.find((t) => t.thread_id === courseState.selectedThreadId);
    document.getElementById("selected-thread-title").textContent = selectedThread ? selectedThread.title : "Messages";
    document.getElementById("reply-thread-id").value = selectedThread ? selectedThread.thread_id : "";

    document.querySelectorAll("[data-thread-id]").forEach((button) => {
        button.addEventListener("click", async () => {
            courseState.selectedThreadId = Number(button.dataset.threadId);
            // clear reply state
            document.getElementById("reply-parent-id").value = "";
            document.getElementById("reply-banner").classList.add("d-none");
            renderThreads();
            await loadThreadPosts();
        });
    });
}

function buildPostTree(posts) {
    const map = new Map();
    const roots = [];
    posts.forEach((post) => { map.set(post.post_id, { ...post, children: [] }); });
    map.forEach((post) => {
        if (post.parent_post_id && map.has(post.parent_post_id)) {
            map.get(post.parent_post_id).children.push(post);
        } else {
            roots.push(post);
        }
    });
    return roots;
}

function fmtChatTime(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderChatBubble(post, isStarter = false) {
    const initials = `U${post.user_id}`;
    return `
        <div class="chat-msg-group ${isStarter ? "chat-msg-starter" : ""}" data-post-id="${post.post_id}">
            <div class="chat-msg-header">
                <div class="chat-msg-avatar">${initials}</div>
                <span class="chat-msg-author">User ${escapeHtml(String(post.user_id))}</span>
                <span class="chat-msg-time">${fmtChatTime(post.created_at)}</span>
                ${isStarter ? `<span class="chat-msg-starter-badge">OP</span>` : ""}
            </div>
            <div class="chat-msg-body">${escapeHtml(post.body)}</div>
            <div class="chat-msg-actions">
                <button class="chat-reply-btn" data-reply-to="${post.post_id}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                    Reply
                </button>
            </div>
            ${post.children && post.children.length ? `
                <div class="chat-reply-thread">
                    ${post.children.map(child => renderChatBubble(child, false)).join("")}
                </div>
            ` : ""}
        </div>
    `;
}

function renderThreadPosts() {
    const container = document.getElementById("thread-posts-list");
    if (!courseState.selectedThreadId) {
        container.innerHTML = `
            <div class="chat-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p>No thread selected</p>
                <p class="chat-empty-sub">Pick a thread from the list to read and reply</p>
            </div>`;
        return;
    }
    if (!courseState.threadPosts.length) {
        container.innerHTML = `<div class="chat-empty"><p>No messages yet.</p><p class="chat-empty-sub">Be the first to reply!</p></div>`;
        return;
    }
    const tree = buildPostTree(courseState.threadPosts);
    container.innerHTML = tree.map((post, i) => renderChatBubble(post, i === 0)).join("");

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Wire up inline reply buttons
    container.querySelectorAll(".chat-reply-btn[data-reply-to]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const postId = btn.dataset.replyTo;
            document.getElementById("reply-parent-id").value = postId;
            document.getElementById("reply-banner-text").textContent = `Replying to post #${postId}`;
            document.getElementById("reply-banner").classList.remove("d-none");
            document.getElementById("chat-message-input").focus();
        });
    });
}

function renderCourseHeader() {
    if (!courseState.course) return;
    document.getElementById("course-title").textContent = `${courseState.course.course_code} — ${courseState.course.course_name}`;
    document.getElementById("course-subtitle").textContent = courseState.course.description || "No description available.";
}

function renderAssignmentSubmissions() {
    // For students this is a no-op — student view is handled in renderAssignmentDetail()
    const role = window.APP_CONFIG.role;
    if (role === "student") return;

    const inner = document.getElementById("asgn-submissions-inner");
    if (!inner) return;

    if (!courseState.selectedAssignmentId) {
        inner.innerHTML = `<div class="cms-muted" style="font-size:13px">Select an assignment to load submissions.</div>`;
        return;
    }
    if (!courseState.assignmentSubmissions.length) {
        inner.innerHTML = `<div class="cms-muted" style="font-size:13px">No submissions yet.</div>`;
        return;
    }

    const a = courseState.assignments.find((x) => x.assignment_id === courseState.selectedAssignmentId);
    const maxScore = a ? Number(a.max_score) : 100;

    inner.innerHTML = `
        <div class="asgn-submissions-grid">
            ${courseState.assignmentSubmissions.map((sub) => {
                const graded = sub.score !== null && sub.score !== undefined;
                const pct = graded ? Math.round((Number(sub.score) / maxScore) * 100) : null;
                return `
                <div class="asgn-sub-card">
                    <div class="asgn-sub-header">
                        <div class="asgn-sub-avatar">${escapeHtml(sub.full_name[0] || "?")}</div>
                        <div class="asgn-sub-info">
                            <div class="asgn-sub-name">${escapeHtml(sub.full_name)}</div>
                            <div class="asgn-sub-meta">
                                <span class="mono" style="font-size:11px">${escapeHtml(sub.user_code)}</span>
                                &nbsp;·&nbsp; ${formatDateTime(sub.submitted_at)}
                            </div>
                        </div>
                        <div class="asgn-sub-grade-display">
                            ${graded
                                ? `<span class="asgn-sub-score">${sub.score}<span class="asgn-sub-max">/${maxScore}</span></span>
                                   <span class="asgn-badge ${pct >= 70 ? "asgn-badge-green" : pct >= 50 ? "asgn-badge-amber" : "asgn-badge-red"}">${pct}%</span>`
                                : `<span class="asgn-badge asgn-badge-muted">Ungraded</span>`}
                        </div>
                    </div>

                    ${sub.submission_text ? `<p class="asgn-sub-comment">${escapeHtml(sub.submission_text)}</p>` : ""}
                    ${sub.submission_url
                        ? `<a href="${escapeHtml(sub.submission_url)}" target="_blank" rel="noreferrer" class="cms-btn cms-btn-ghost cms-btn-sm" style="margin-bottom:12px">Open submitted file ↗</a>`
                        : ""}

                    <form class="grade-submission-form asgn-grade-form" data-submission-id="${sub.submission_id}">
                        <div class="asgn-grade-row">
                            <div class="cms-field" style="width:110px;flex-shrink:0">
                                <label class="cms-label">Score <span style="color:var(--text-3);font-weight:400">/ ${maxScore}</span></label>
                                <input class="cms-input" type="number" step="0.01" min="0" max="${maxScore}"
                                    name="score" value="${sub.score ?? ""}" placeholder="0" required>
                            </div>
                            <div class="cms-field">
                                <label class="cms-label">Feedback</label>
                                <input class="cms-input" name="feedback"
                                    value="${escapeHtml(sub.feedback || "")}" placeholder="Leave feedback for the student\u2026">
                            </div>
                            <div style="padding-top:18px;flex-shrink:0">
                                <button class="cms-btn ${graded ? "cms-btn-ghost" : "cms-btn-success"} cms-btn-sm" type="submit">
                                    ${graded ? "Update" : "Post Grade"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>`;
            }).join("")}
        </div>
    `;

    inner.querySelectorAll(".grade-submission-form").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const btn = form.querySelector("button[type=submit]");
            btn.disabled = true;
            btn.textContent = "Saving…";
            try {
                await apiRequest(`/submissions/${form.dataset.submissionId}/grade`, {
                    method: "POST",
                    body: JSON.stringify({ score: Number(form.score.value), feedback: form.feedback.value })
                });
                await loadAssignmentSubmissions();
                await loadCourseWorkspace();
            } catch (error) {
                alert(error.message);
                btn.disabled = false;
                btn.textContent = "Post Grade";
            }
        });
    });
}

async function loadThreads() {
    if (!courseState.selectedForumId) { courseState.threads = []; renderThreads(); return; }
    const payload = await apiRequest(`/forums/${courseState.selectedForumId}/threads`);
    courseState.threads = payload.threads || [];
    renderThreads();
    await loadThreadPosts();
}

async function loadThreadPosts() {
    if (!courseState.selectedThreadId) { courseState.threadPosts = []; renderThreadPosts(); return; }
    const payload = await apiRequest(`/threads/${courseState.selectedThreadId}/posts`);
    courseState.threadPosts = payload.posts || [];
    renderThreadPosts();
}

async function loadAssignmentSubmissions() {
    if (!courseState.selectedAssignmentId) { courseState.assignmentSubmissions = []; renderAssignmentSubmissions(); return; }
    if (!["admin", "lecturer"].includes(window.APP_CONFIG.role)) { courseState.assignmentSubmissions = []; return; }
    const payload = await apiRequest(`/assignments/${courseState.selectedAssignmentId}/submissions`);
    courseState.assignmentSubmissions = payload.submissions || [];
    renderAssignmentDetail();
    renderAssignmentSubmissions();
}

async function loadCourseWorkspace() {
    const [coursePayload, membersPayload, eventsPayload, forumsPayload, contentPayload, assignmentsPayload] = await Promise.all([
        apiRequest(`/courses/${window.COURSE_ID}`),
        apiRequest(`/courses/${window.COURSE_ID}/members`),
        apiRequest(`/courses/${window.COURSE_ID}/events`),
        apiRequest(`/courses/${window.COURSE_ID}/forums`),
        apiRequest(`/courses/${window.COURSE_ID}/content`),
        apiRequest(`/courses/${window.COURSE_ID}/assignments`)
    ]);

    courseState.course = coursePayload.course;
    courseState.members = membersPayload.members || [];
    courseState.events = eventsPayload.events || [];
    courseState.forums = forumsPayload.forums || [];
    courseState.content = contentPayload.content || [];
    courseState.assignments = assignmentsPayload.assignments || [];

    if (courseState.selectedForumId && !courseState.forums.some((f) => f.forum_id === courseState.selectedForumId)) courseState.selectedForumId = null;
    if (courseState.selectedThreadId && !courseState.threads.some((t) => t.thread_id === courseState.selectedThreadId)) courseState.selectedThreadId = null;
    if (courseState.selectedAssignmentId && !courseState.assignments.some((a) => a.assignment_id === courseState.selectedAssignmentId)) courseState.selectedAssignmentId = null;

    renderCourseHeader();
    renderMembers();
    renderEvents();
    renderContent();
    renderAssignments();
    renderForums();
    renderSectionsSelect();
    updateCounters();
    await loadThreads();
    await loadAssignmentSubmissions();
}

function bindTabs() {
    document.querySelectorAll("#workspace-tabs .cms-tab").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll("#workspace-tabs .cms-tab").forEach((b) => b.classList.remove("cms-tab-active"));
            document.querySelectorAll(".cms-panel").forEach((p) => p.classList.remove("cms-panel-active"));
            button.classList.add("cms-tab-active");
            document.getElementById(button.dataset.panel).classList.add("cms-panel-active");
        });
    });
}

function bindForms() {
    document.getElementById("refresh-course-btn")?.addEventListener("click", async () => {
        try { await loadCourseWorkspace(); } catch (error) { alert(error.message); }
    });

    document.getElementById("create-event-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            await apiRequest(`/courses/${window.COURSE_ID}/events`, {
                method: "POST",
                body: JSON.stringify({
                    title: form.title.value,
                    description: form.description.value,
                    start_datetime: toApiDateTime(form.start_datetime.value),
                    end_datetime: toApiDateTime(form.end_datetime.value)
                })
            });
            form.reset();
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("create-section-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            await apiRequest(`/courses/${window.COURSE_ID}/sections`, {
                method: "POST",
                body: JSON.stringify({ title: form.title.value, position_no: Number(form.position_no.value) })
            });
            form.reset();
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("add-content-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            const payload = new FormData();
            payload.append("title", form.title.value);
            payload.append("content_type", form.content_type.value);
            payload.append("resource_url", form.resource_url.value);
            payload.append("file_reference", form.file_reference.value);
            payload.append("description", form.description.value);
            if (form.file.files[0]) payload.append("file", form.file.files[0]);
            const headers = {};
            if (window.APP_CONFIG?.token) headers.Authorization = `Bearer ${window.APP_CONFIG.token}`;
            const response = await fetch(`/sections/${form.section_id.value}/content`, { method: "POST", headers, body: payload });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Unable to add content");
            renderGeneratedUrlResult("add-content-result", result, "Generated file URLs");
            form.reset();
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("edit-content-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.content_id.value) { alert("Select a content item first."); return; }
        try {
            const payload = new FormData();
            payload.append("title", form.title.value);
            payload.append("content_type", form.content_type.value);
            payload.append("resource_url", form.resource_url.value);
            payload.append("file_reference", form.file_reference.value);
            payload.append("description", form.description.value);
            if (form.file.files[0]) payload.append("file", form.file.files[0]);
            const headers = {};
            if (window.APP_CONFIG?.token) headers.Authorization = `Bearer ${window.APP_CONFIG.token}`;
            const response = await fetch(`/content/${form.content_id.value}`, { method: "PUT", headers, body: payload });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Unable to update content");
            renderGeneratedUrlResult("edit-content-result", result, "Updated file URLs");
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("toggle-create-assignment-btn")?.addEventListener("click", () => {
        document.getElementById("create-assignment-panel")?.classList.toggle("d-none");
    });
    document.getElementById("cancel-create-assignment-btn")?.addEventListener("click", () => {
        document.getElementById("create-assignment-panel")?.classList.add("d-none");
    });

    document.getElementById("create-assignment-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            await apiRequest(`/courses/${window.COURSE_ID}/assignments`, {
                method: "POST",
                body: JSON.stringify({
                    title: form.title.value,
                    description: form.description.value,
                    due_datetime: toApiDateTime(form.due_datetime.value),
                    max_score: Number(form.max_score.value)
                })
            });
            form.reset();
            document.getElementById("create-assignment-panel")?.classList.add("d-none");
            await loadCourseWorkspace();
            renderAssignmentDetail();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("create-forum-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            await apiRequest(`/courses/${window.COURSE_ID}/forums`, {
                method: "POST",
                body: JSON.stringify({ title: form.title.value, description: form.description.value })
            });
            form.reset();
            await loadCourseWorkspace();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("create-thread-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.forum_id.value) { alert("Select a forum first."); return; }
        try {
            await apiRequest(`/forums/${form.forum_id.value}/threads`, {
                method: "POST",
                body: JSON.stringify({ title: form.title.value, body: form.body.value })
            });
            form.reset();
            await loadThreads();
        } catch (error) { alert(error.message); }
    });

    document.getElementById("reply-form")?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.thread_id.value) { alert("Select a thread first."); return; }
        const body = form.body.value.trim();
        if (!body) return;
        try {
            await apiRequest(`/threads/${form.thread_id.value}/replies`, {
                method: "POST",
                body: JSON.stringify({
                    parent_post_id: form.parent_post_id.value ? Number(form.parent_post_id.value) : null,
                    body
                })
            });
            form.body.value = "";
            // reset reply state
            form.parent_post_id.value = "";
            document.getElementById("reply-banner").classList.add("d-none");
            await loadThreadPosts();
        } catch (error) { alert(error.message); }
    });

    // Auto-resize chat textarea
    document.getElementById("chat-message-input")?.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    // Enter to send (Shift+Enter = newline)
    document.getElementById("chat-message-input")?.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            document.getElementById("reply-form")?.requestSubmit();
        }
    });

    // Cancel reply banner
    document.getElementById("cancel-reply-btn")?.addEventListener("click", () => {
        document.getElementById("reply-parent-id").value = "";
        document.getElementById("reply-banner").classList.add("d-none");
    });

    // Toggle new-forum form
    document.getElementById("toggle-new-forum-btn")?.addEventListener("click", () => {
        const form = document.getElementById("create-forum-form");
        form?.classList.toggle("d-none");
    });
    document.getElementById("cancel-new-forum-btn")?.addEventListener("click", () => {
        document.getElementById("create-forum-form")?.classList.add("d-none");
    });

    // Toggle new-thread form
    document.getElementById("toggle-new-thread-btn")?.addEventListener("click", () => {
        const form = document.getElementById("create-thread-form");
        form?.classList.toggle("d-none");
    });
    document.getElementById("cancel-new-thread-btn")?.addEventListener("click", () => {
        document.getElementById("create-thread-form")?.classList.add("d-none");
    });
}

(async function initCourseDetail() {
    bindTabs();
    bindForms();
    try {
        await loadCourseWorkspace();
    } catch (error) {
        document.getElementById("course-subtitle").textContent = error.message;
        ["members-list", "events-list"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<li style="color:var(--red);padding:12px 0;font-size:13px">${escapeHtml(error.message)}</li>`;
        });
        ["forums-list", "content-list", "assignments-list", "threads-list", "thread-posts-list"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div style="color:var(--red);font-size:13px">${escapeHtml(error.message)}</div>`;
        });
    }
})();