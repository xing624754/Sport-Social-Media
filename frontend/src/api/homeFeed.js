// Get -> load the posts for the chosen tab.
//   tab is one of "recommended", "following", "community".
export const getHomeFeed = async (tab, excludeSelf = true, page = 1, limit = 10) => {
    return await fetch(`/api/home-feed?tab=${tab}&exclude_self=${excludeSelf}&page=${page}&limit=${limit}`, {
        credentials: "include"
    });
};

// Get -> search public posts by a keyword (matches the title or description).
export const searchPosts = async (keyword) => {
    return await fetch(`/api/search-posts?q=${encodeURIComponent(keyword)}`, {
        credentials: "include"
    });
};
