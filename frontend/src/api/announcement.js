// GET - load all announcements (admin only)
export const getAnnouncements = async () => {
    return await fetch("/api/announcements", {
        credentials: "include"
    });
};

// POST - create + send a new announcement to all users (admin only).
// Sends multipart form data so an optional image can ride along.
export const createAnnouncement = async (title, content, file) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (file) formData.append("file", file);

    return await fetch("/api/announcement", {
        method: "POST",
        credentials: "include",
        body: formData            // browser sets the multipart Content-Type itself
    });
};

// DELETE - soft-delete an announcement (admin only)
export const deleteAnnouncement = async (announcementId) => {
    return await fetch(`/api/announcement/${announcementId}`, {
        method: "DELETE",
        credentials: "include"
    });
};
