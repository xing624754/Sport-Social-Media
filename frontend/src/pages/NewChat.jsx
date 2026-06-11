import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { newGroup } from "../api/chat";
import { newChat } from "../api/chat";
import { getOtherUsers } from "../api/chat";

import searchIcon from "../assets/search.png";

import "../styles/NewChat.css";

export default function NewChat({ userID, setOpenOneChat, setChats }){
    const BASE_URL = "http://localhost:5000/chat";
    
    // open create group or new chat page
    const [createGroup, setCreateGroup] = useState(false);
    const [createChat, setCreateChat] = useState(false);

    // new group chat & new chat details
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [otherUsers, setOtherUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [newChatUser, setNewChatUser] = useState(null);

    const loadOtherUsers = async (userID) => {
        
        try{
            const response = await getOtherUsers(userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setOtherUsers(
                Array.isArray(data.other_user_data)
                    ? data.other_user_data
                    : []
            );
        }
        catch(err) {
            toast.error("Network error");
        }
        
    };

    // load other users when user clicks create group or new chat
    useEffect(() => {
        if ((createGroup || createChat) && userID) {
            loadOtherUsers(userID);
        }
    }, [createGroup, createChat, userID]);

    // filter users based on search keyword
    useEffect(() => {
        const filtered = otherUsers.filter((otherUser) => 
            otherUser.username.toLowerCase().includes(search.toLowerCase())
        );

        setFilteredUsers(filtered);
    }, [search, otherUsers]);

    const handleSelectUser = (userID, username, profilePic) => {
        if(selectedUsers.find((selectedUser) => selectedUser.userID === userID)){
            toast.error("You have selected this user");
            return;
        }

        setSelectedUsers((prev) => {
            return [
                ...prev,
                {
                    "userID": userID,
                    "username": username,
                    "profilePic": profilePic
                }
            ];
        });
    };

    const removeSelectUser = (userID) => {
        const updatedUsers = selectedUsers.filter(
            (selectedUser) => selectedUser.userID !== userID
        );

        setSelectedUsers(updatedUsers);
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();

        if(selectedUsers.length < 2){
            toast.error("Please select at least 2 users to create a group chat");
            return;
        }
        if(groupName === ""){
            toast.error("Please enter a group name");
            return;
        }
        
        try {
            const response = await newGroup(userID, groupName, selectedUsers);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setChats(data.user_chats);
            toast.success(data.success);
            setCreateGroup(false);
            setOpenOneChat(data.chat_id);
            setCreateGroup(false);
            setSelectedUsers([]);
            setGroupName("");
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleNewChat = async (e) => {
        e.preventDefault();
        
        if(!newChatUser){
            toast.error("Please select a user");
            return;
        }

        try{
            const response = await newChat(userID, newChatUser);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setChats(data.user_chats);
            toast.success(data.success);
            setCreateChat(false);
            setOpenOneChat(data.chat_id);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(!createGroup){
            setOtherUsers([]);
            setGroupName("");
            setSearch("");
            setFilteredUsers([]);
            setSelectedUsers([]);
        }
    }, [createGroup]);

    useEffect(() => {
        if(!createChat){
            setOtherUsers([]);
            setSearch("");
            setFilteredUsers([]);
            setNewChatUser(null);
        }
    }, [createChat]);

    return(
        <div>
            <div className="new-chat-dropdown">
                <button
                    className="more-actions-options"
                    type="button"
                    onClick={() => {
                        setCreateGroup(true);
                    }}
                >
                    Create Group
                </button>

                <button
                    className="more-actions-options"
                    type="button"
                    onClick={() => {
                        setCreateChat(true);
                    }}
                >
                    New Chat
                </button>
            </div>

            {createGroup && (
                <div className="overlay">
                    <div className="pop-up">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => {setCreateGroup(false)}}
                        >
                            ✕
                        </button>

                        <form className="create-group-form" onSubmit={handleCreateGroup}>
                            <label className="input-label">
                                Group Name
                                <input
                                    className="text-input"
                                    type="text"
                                    placeholder="Enter group chat name"
                                    value={groupName}
                                    onChange={(e) => {setGroupName(e.target.value)}}
                                />
                            </label>

                            <div className="search-container">
                                <label className="input-label">
                                    Add Group Members
                                </label>

                                <div className="search-bar">
                                    <input
                                        className="text-input"
                                        type="text"
                                        placeholder="Enter username"
                                        value={search}
                                        onChange={(e) => {setSearch(e.target.value)}}
                                    />
                                    <img src={searchIcon} alt="search" />
                                </div>

                                <div className="search-results-container">
                                    {filteredUsers.length > 0 ? ( 
                                        filteredUsers.map((otherUser, index) => (
                                            <div
                                                className="search-results-wrapper"
                                                key={index}
                                                onClick={() => 
                                                    handleSelectUser(        
                                                        otherUser.user_id, 
                                                        otherUser.username,          
                                                        otherUser.profile_pic
                                                    )
                                                }
                                            >
                                                <img 
                                                    className="profile-pic"
                                                    src={`${BASE_URL}${otherUser.profile_pic}`} 
                                                    alt="profile picture" 
                                                />

                                                <label>{otherUser.username}</label>
                                            </div>
                                        )) 
                                    ) : (
                                        <label className="no-user-label">No user found</label>
                                    )}
                                </div>
                            </div>

                            {selectedUsers.length > 0 && (
                                <div className="selected-users-container">
                                    {selectedUsers.map((selectedUser, index) => (
                                        <div
                                            className="selected-users-wrapper"
                                            key={index}
                                        >
                                            <label>
                                                {selectedUser.username}
                                            </label>

                                            <button
                                                className="remove-user-button"
                                                type="button"
                                                onClick={() => removeSelectUser(selectedUser.userID)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                className="action-button"
                                type="submit"
                            >
                                Create Group Chat
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {createChat && (
                <div className="overlay">
                    <div className="pop-up">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => {setCreateChat(false)}}
                        >
                            ✕
                        </button>

                        <form className="new-chat-form" onSubmit={handleNewChat}>
                            <label className="input-label">New Chat</label>

                            <div className="search-container">
                                <div className="search-bar">
                                    <input
                                        className="text-input"
                                        type="text"
                                        placeholder="Enter username"
                                        value={search}
                                        onChange={(e) => {setSearch(e.target.value)}}
                                    />
                                    <img src={searchIcon} alt="search" />
                                </div>

                                <div className="search-results-container">
                                    {filteredUsers.length > 0 ? 
                                        filteredUsers.map((otherUser, index) => (
                                            <div
                                                className="search-results-wrapper"
                                                key={index}
                                                onClick={() => setNewChatUser({
                                                    "userID": otherUser.user_id,
                                                    "username": otherUser.username
                                                })}
                                            >
                                                <img 
                                                    className="profile-pic"
                                                    src={`${BASE_URL}${otherUser.profile_pic}`} 
                                                    alt="profile picture" 
                                                />

                                                <label>{otherUser.username}</label>
                                            </div>
                                        ))
                                        : <label className="no-user-label">No user found</label>
                                    }
                                </div>
                            </div>

                            {newChatUser && (
                                <div className="selected-user-wrapper">
                                    <label>Selected User: @{newChatUser.username}</label>
                                </div>
                            )}

                            <button
                                className="action-button"
                                type="submit"
                            >
                                New Chat
                            </button>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};