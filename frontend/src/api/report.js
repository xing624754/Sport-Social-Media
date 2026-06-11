// Sends a report about a user to the backend.
export const reportUser = async (userId, reason) => {
    return await fetch(`/api/report/account/${userId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: reason })
    });
};

// Sends a report about a post to the backend.
export const reportPost = async (postId, reason) => {
    return await fetch(`/api/report/post/${postId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: reason })
    });
};
