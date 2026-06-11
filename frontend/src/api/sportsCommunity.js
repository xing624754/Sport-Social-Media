
export const getCommunities = async (userID, currentNoOfCommunities) =>  {
    return await fetch("/community/load-communities", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            currentNoOfCommunities
        })
    });
};

export const getJoinedCommunities = async (userID, currentNoOfCommunities) => {
    return await fetch("/community/load-joined-communities", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            currentNoOfCommunities
        })
    });
};

export const createNewCommunity = async (userID, communityName, communityBio, publicity) => {
    return await fetch("/community/create-community", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            communityName,
            communityBio,
            publicity
        })
    });
};

export const joinCommunity = async (userID, communityInfo) => {
    return await fetch("/community/join-community", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            communityInfo
        })
    });
};

export const cancelJoinRequest = async (userID, communityID) => {
    return await fetch("/community/cancel-join-request", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            communityID
        })
    });
};

export const editCommunityDetails = async (previousDetails, communityName, communityBio, publicity) => {
    return await fetch("/community/edit-community-details", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            previousDetails,
            communityName,
            communityBio,
            publicity
        })
    });
};

export const getRequests = async (communityID) => {
    return await fetch("/community/load-requests", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityID
        })
    });
};

export const approveRequest = async (request, chatID, communityName) => {
    return await fetch("/community/approve-request", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            request,
            chatID,
            communityName
        })
    });
};

export const rejectRequest = async (requestInfo, communityName) => {
    return await fetch("/community/reject-request", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            requestInfo,
            communityName
        })
    });
};

export const getOtherUsers = async (communityID) => {
    return await fetch("/community/load-other-users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityID
        })
    });
};

export const addCommunityMembers = async (selectedUsers, communityInfo) => {
    return await fetch("/community/add-members", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            selectedUsers,
            communityInfo
        })
    });
};

export const getExistingMembers = async (communityID) => {
    return await fetch("/community/load-existing-members", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityID
        })
    });
};

export const deleteMembers = async (selectedDeleteMembers, communityInfo) => {
    return await fetch("/community/delete-members", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            selectedDeleteMembers,
            communityInfo
        })
    });
};

export const deleteCommunity = async (communityInfo) => {
    return await fetch("/community/delete-community", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityInfo
        })
    });
};

export const leaveCommunity = async (communityInfo, userID) => {
    return await fetch("/community/leave-community", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityInfo,
            userID
        })
    });
};  

export const getReportContent = async (communityID, selectedMonth) => {
    return await fetch("/community/get-report-content", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityID,
            selectedMonth
        })
    });
};

export const checkUserInChat = async (chatID, userID) => {
    return await fetch("/community/check-user-in-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            chatID,
            userID
        })
    });
};

export const getPosts = async (communityID, currentNoOfPosts, userID) =>  {
    return await fetch("/community/load-posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            communityID,
            currentNoOfPosts,
            userID
        })
    });
};
