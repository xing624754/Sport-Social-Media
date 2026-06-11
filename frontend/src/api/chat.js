import axios from "axios";

export const getChats = async (userID) => {
    return await fetch("/chat/load-chats", {
        method:"POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID
        })
    });
};

export const getTotalUnreadCount = async (userID) => {
    if (!userID) {
        console.warn("Missing userID for unread count");
        return null;
    }

    return await fetch("/chat/load-total-unread-count", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ userID })
    });
};

export const getOtherUsers = async (userID) => {
    return await fetch("/chat/load-other-users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID
        })
    });
};

export const newGroup = async (userID, groupName, selectedUsers) => {
    return await fetch("/chat/new-group", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            groupName,
            selectedUsers
        })
    });
};

export const newChat = async (userID, selectedUser) => {
    return await fetch("/chat/new-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            selectedUser
        })
    });
};

export const getChatInfo = async (chatID, userID) => {
    return await fetch("/chat/load-chat-info", {
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

export const getNotInGroupUsers = async (chatID) => {
    return await fetch("/chat/load-not-in-group-users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            chatID
        })
    });
};

export const getNotInGroupMembers = async (chatID, communityID) => {
    return await fetch("/chat/load-not-in-group-members", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            chatID, 
            communityID
        })
    });
};

export const addMembers = async (chatID, selectedUsers) => {
    return await fetch("/chat/add-group-members", {
        method:"POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            chatID, 
            selectedUsers
        })
    });
};

export const getExistingMembers = async (chatID) => {
    return await fetch("/chat/load-existing-members", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            chatID
        })
    });
};

export const deleteMembers = async (selectedDeleteMembers, chatID) => {
    return await fetch("/chat/delete-members", {
        method:"POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            selectedDeleteMembers,
            chatID
        })
    });
};

export const removeGroupChat = async (userID, chatID) => {
    return await fetch("/chat/delete-group-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            chatID
        })
    });
};

export const exitGroupChat = async (userID, chatID) => {
    return await fetch("/chat/exit-group-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            chatID
        })
    });
};

export const deletePrivateChat = async (userID, chatID) => {
    return await fetch("/chat/delete-private-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            chatID
        })
    });
};

export const getMessages = async (userID, chatID, oldestMessageID) => {
    return await fetch("/chat/load-messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            chatID,
            oldestMessageID
        })
    });
};

export const sendMessage = async (formData) => {
    return await axios.post("/chat/send-message", formData, {
        withCredentials: true
    });
};

export const readMessages = async (userID, chatID) => {
    return await fetch("/chat/read-all-messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            chatID
        })
    });
};

export const openPrivateChat = async (currentUserID, userID) => {
    return await fetch("/chat/open-private-chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            currentUserID,
            userID
        })
    });
};
