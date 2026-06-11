
// GET - load the logged-in user's notifications + unread count
export const getNotifications = async () => {
    return await fetch("/api/notifications", {
        credentials: "include"
    });
};

// PUT - mark all the user's notifications as read (clears the red badge)
export const markNotificationsRead = async () => {
    return await fetch("/api/notifications/read", {
        method: "PUT",
        credentials: "include"
    });
};

