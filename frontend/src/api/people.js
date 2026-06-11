// GET - a short list of other people (for the homepage "People" box)
export const getPeople = async () => {
    return await fetch("/api/people", {
        credentials: "include"
    });
};

// GET - search active users by username (homepage People box)
export const searchPeople = async (query) => {
    return await fetch(`/api/people/search?q=${encodeURIComponent(query)}`, {
        credentials: "include"
    });
};

// POST - follow this person
export const followUser = async (userId) => {
    return await fetch(`/api/follow/${userId}`, {
        method: "POST",
        credentials: "include"
    });
};

// POST - unfollow this person
export const unfollowUser = async (userId) => {
    return await fetch(`/api/unfollow/${userId}`, {
        method: "POST",
        credentials: "include"
    });
};
