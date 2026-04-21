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
