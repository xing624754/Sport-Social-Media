// POST - toggle like on a post (likes if not liked, unlikes if already liked)
export const toggleLike = async (postId) => {
    return await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        credentials: "include"
    });
};

// POST - toggle favorite (bookmark) on a post
export const toggleFavorite = async (postId) => {
    return await fetch(`/api/posts/${postId}/favorite`, {
        method: "POST",
        credentials: "include"
    });
};

// GET - load a single post's details
export const getPost = async (postId) => {
    return await fetch(`/api/posts/${postId}`, {
        credentials: "include"
    });
};

// GET - load all comments for a post
export const getComments = async (postId) => {
    return await fetch(`/api/posts/${postId}/comments`, {
        credentials: "include"
    });
};

// POST - add a comment to a post
export const addComment = async (postId, comment) => {
    return await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment })
    });
};
