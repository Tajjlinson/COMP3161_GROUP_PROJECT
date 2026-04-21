function renderList(elementId, items, renderItem, emptyText) {
    const element = document.getElementById(elementId);
    if (!items.length) {
        element.innerHTML = `<li class="list-group-item text-muted">${emptyText}</li>`;
        return;
    }
    element.innerHTML = items.map(renderItem).join("");
}

(async function initCourseDetail() {
    try {
        const [members, events, forums, content] = await Promise.all([
            apiRequest(`/courses/${window.COURSE_ID}/members`),
            apiRequest(`/courses/${window.COURSE_ID}/events`),
            apiRequest(`/courses/${window.COURSE_ID}/forums`),
            apiRequest(`/courses/${window.COURSE_ID}/content`)
        ]);

        renderList(
            "members-list",
            members.members || [],
            (item) => `<li class="list-group-item"><strong>${escapeHtml(item.full_name)}</strong> <span class="text-muted">(${escapeHtml(item.role)})</span></li>`,
            "No members found."
        );

        renderList(
            "events-list",
            events.events || [],
            (item) => `<li class="list-group-item"><strong>${escapeHtml(item.title)}</strong><br><small class="text-muted">${escapeHtml(item.start_datetime)}</small></li>`,
            "No events found."
        );

        renderList(
            "forums-list",
            forums.forums || [],
            (item) => `<li class="list-group-item"><strong>${escapeHtml(item.title)}</strong><br><small class="text-muted">${escapeHtml(item.description || "No description")}</small></li>`,
            "No forums found."
        );

        renderList(
            "content-list",
            content.content || [],
            (item) => `<li class="list-group-item"><strong>${escapeHtml(item.section_title)}</strong> - ${escapeHtml(item.title || "No content yet")}</li>`,
            "No content found."
        );
    } catch (error) {
        ["members-list", "events-list", "forums-list", "content-list"].forEach((id) => {
            document.getElementById(id).innerHTML = `<li class="list-group-item text-danger">${escapeHtml(error.message)}</li>`;
        });
    }
})();
