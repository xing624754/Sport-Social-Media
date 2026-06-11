// GET - load top 5 recommended communities
export const getCommunities = async () => {
    return await fetch("/api/communities", {
        credentials: "include"
    });
};

// POST - join a community
export const joinCommunity = async (communityId) => {
    return await fetch(`/api/join/${communityId}`, {
        method: "POST",
        credentials: "include"
    });
};
