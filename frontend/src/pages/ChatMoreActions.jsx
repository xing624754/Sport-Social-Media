import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import socket from "../api/socket";

import { getNotInGroupUsers } from "../api/chat";
import { getNotInGroupMembers } from "../api/chat";
import { addMembers } from "../api/chat";
import { getExistingMembers } from "../api/chat";
import { deleteMembers } from "../api/chat";
import { removeGroupChat } from "../api/chat";
import { exitGroupChat } from "../api/chat";
import { deletePrivateChat } from "../api/chat";

import searchIcon from "../assets/search.png";

import "../styles/ChatMoreActions.css";

export default function ChatMoreActions({ userID, chatID, chatInfo, setOpenOneChat, setChats }){
    const BASE_URL = "http://localhost:5000/chat";
    
    const [groupChatRole, setGroupChatRole] = useState("");
    const [communityID, setCommunityID] = useState(null);
    const [isRemoved, setIsRemoved] = useState(0);
    const [addMember, setAddMember] = useState(false);
    const [deleteMember, setDeleteMember] = useState(false);
    const [deleteGroup, setDeleteGroup] = useState(false);
    const [exitGroup, setExitGroup] = useState(false);
    const [deleteGroupChat, setDeleteGroupChat] = useState(false);
    const [deleteChat, setDeleteChat] = useState(false);
    
    const [search, setSearch] = useState("");
    const [otherUsers, setOtherUsers] = useState([]);
    const [otherMembers, setOtherMembers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const [confirmAddMembers, setConfirmAddMembers] = useState(false);
    
    // delete members variables
    const [existingMembers, setExistingMembers] = useState([]);
    const [selectedDeleteMembers, setSelectedDeleteMembers] = useState([]);
    const [confirmDeleteMembers, setConfirmDeleteMembers] = useState(false);

    useEffect(() => {
        if(chatInfo.chat_type === "Group"){
            setGroupChatRole(chatInfo.user_role);
            setIsRemoved(chatInfo.is_removed)
        }

        if(chatInfo.chat_type === "Group" && chatInfo.user_role === "Community Admin"){
            setCommunityID(chatInfo.community_id);
        }
    }, [chatInfo]);

    // load other users that are not in the group (for normal group chats)
    const loadOtherUsers = async (chatID) => {
        if(otherUsers.length === 0){
            try{
                const response = await getNotInGroupUsers(chatID);
                const data = await response.json();

                if(!response.ok){
                    toast.error(data.error);
                    return;
                }

                setOtherUsers(data.other_users);
            }
            catch(err) {
                toast.error("Network error");
            }
        }
    };

    // load other community members that are not in the group (for community group chats)
    const loadOtherMembers = async (chatID, communityID) => {
        if(otherMembers.length === 0){
            try{
                const response = await getNotInGroupMembers(chatID, communityID);
                const data = await response.json();

                if(!response.ok){
                    toast.error(data.error);
                    return;
                }

                setOtherMembers(data.other_members);
            }
            catch(err) {
                toast.error("Network error");
            }
        }
    };

    // load other users when user clicks create group or new chat
    useEffect(() => {
        if(addMember){
            if(groupChatRole === "Admin"){
                loadOtherUsers(chatID);
            }
            if(groupChatRole === "Community Admin"){
                loadOtherMembers(chatID, communityID);
            }
        }
    }, [addMember]);

    // filter users based on search keyword
    const filteredUsers = otherUsers.filter((otherUser) => 
        otherUser.username.toLowerCase().includes(search.toLowerCase())
    );

    // filter community members that are not in group based on search keyword
    const filteredMembers = otherMembers.filter((otherMember) => 
        otherMember.username.toLowerCase().includes(search.toLowerCase())
    );

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

    const handleAddMembers = async (e) => {
        e.preventDefault();

        try {
            const response = await addMembers(chatID, selectedUsers);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setConfirmAddMembers(false);
            setAddMember(false);
            setSelectedUsers([]);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(!addMember){
            setOtherMembers([]);
            setOtherUsers([]);
            setSearch("");
            setSelectedUsers([]);
        }
    }, [addMember]);

    const loadExistingMembers = async (chatID) => {
        try {
            const response = await getExistingMembers(chatID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setExistingMembers(data.existing_members);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(deleteMember){
            loadExistingMembers(chatID);
        }
    }, [deleteMember]);

    const toggleDeleteMember = (member) => {
        setSelectedDeleteMembers((prev) => {
            const exists = prev.some(
                (selected) => selected.user_id === member.user_id
            )

            if(exists){
                return prev.filter(
                    (selected) => selected.user_id !== member.user_id
                );
            }

            return [...prev, member];
        });
    };

    const handleDeleteMembers = async (e) => {
        e.preventDefault();

        try{
            const response = await deleteMembers(selectedDeleteMembers, chatID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setDeleteMember(false);
            setConfirmDeleteMembers(false);
            setSelectedDeleteMembers([]);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    const handleDeleteGroup = async () => {
        try {
            const response = await removeGroupChat(userID, chatID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setChats(data.user_chats);
            setOpenOneChat(null);
            setAddMember(false);
            setDeleteMember(false);
            setConfirmAddMembers(false);
            setConfirmDeleteMembers(false);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    const handleExitGroup = async () => {
        try {
            const response = await exitGroupChat(userID, chatID);
            const data = await response.json();

            if(!response.ok) {
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setChats(data.user_chats);
            setOpenOneChat(null);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    const handleDeleteChat = async () => {
        try{
            const response = await deletePrivateChat(userID, chatID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setChats(data.user_chats)
            setOpenOneChat(null);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    return(
        <div>
            {chatInfo.chat_type === "Group" && (groupChatRole === "Admin" || groupChatRole === "Community Admin") && (
                <div className="more-actions-dropdown">
                    <button
                        className="more-actions-options"
                        type="button"
                        onClick={() => setAddMember(true)}
                    >
                        Add Member
                    </button>

                    <button
                        className="more-actions-options"
                        type="button"
                        onClick={() => setDeleteMember(true)}
                    >
                        Delete Member
                    </button>

                    {groupChatRole === "Admin" && (
                        <button
                            className="more-actions-options danger"
                            type="button"
                            onClick={() => setDeleteGroup(true)}
                        >
                            Delete Group Chat
                        </button>
                    )}
                </div>
            )} 

            {chatInfo.chat_type === "Group" && groupChatRole === "Member" && (
                <div className="more-actions-dropdown">
                    <button
                        className="more-actions-options danger"
                        type="button"
                        onClick={() => setExitGroup(true)}
                    >
                        Exit Group
                    </button>
                </div>
            )}

            {/* User can choose to delete the group chat if they have been removed from the group */}
            {chatInfo.chat_type === "Group" && groupChatRole === "Member" && isRemoved === 1 && (
                <div className="more-actions-dropdown">
                    <button
                        className="more-actions-options danger"
                        type="button"
                        onClick={() => setDeleteGroupChat(true)}
                    >
                        Delete Chat
                    </button>
                </div>
            )}

            {/* User can choose to delete a private chat on their side, but others can stil view and send messages */}
            {chatInfo.chat_type === "Private" && (
                <div className="more-actions-dropdown">
                    <button
                        className="more-actions-options danger"
                        type="button"
                        onClick={() => setDeleteChat(true)}
                    >
                        Delete Chat
                    </button>
                </div>
            )}
        
            {addMember && (
                <div className="overlay">
                    <div className="pop-up">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => {setAddMember(false)}}
                        >
                            ✕
                        </button>

                        <form className="add-member-form">
                            <label className="input-label">
                                Add Group Members
                            </label>

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

                                {groupChatRole === "Admin" &&(
                                    <div className="search-results-container">
                                        {filteredUsers.length > 0 ? 
                                            filteredUsers.map((otherUser, index) => (
                                                <div
                                                    className="search-results-wrapper"
                                                    key={index}
                                                    onClick={() => handleSelectUser(otherUser.user_id, otherUser.username, otherUser.profile_pic)}
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
                                )}

                                {groupChatRole === "Community Admin" &&(
                                    <div className="search-results-container">
                                        {filteredMembers.length > 0 ? 
                                            filteredMembers.map((otherMember, index) => (
                                                <div
                                                    className="search-results-wrapper"
                                                    key={index}
                                                    onClick={() => handleSelectUser(otherMember.user_id, otherMember.username, otherMember.profile_pic)}
                                                >
                                                    <img 
                                                        className="profile-pic"
                                                        src={`${BASE_URL}${otherMember.profile_pic}`}
                                                        alt="profile picture" 
                                                    />
                                                    <label>{otherMember.username}</label>
                                                </div>
                                            )) 
                                            : <label className="no-user-label">No Available Members</label>
                                        } 
                                    </div>
                                )}
                                
                            </div>

                            {selectedUsers && (
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
                                type="button"
                                disabled={selectedUsers.length === 0}
                                onClick={() => setConfirmAddMembers(true)}
                            >
                                Add Members
                            </button>

                            {confirmAddMembers && (
                                <div className="overlay">
                                    <div className="confirm-pop-up">
                                        <h3>Are you sure you want to add these members?</h3>

                                        {selectedUsers.map((user, index) => (
                                            <label key={index}>
                                                @{user.username}
                                            </label>
                                        ))}
                                        
                                        <div className="confirm-buttons">
                                            <button 
                                                className="confirm-button"
                                                type="button"
                                                onClick={handleAddMembers}
                                            >
                                                Yes
                                            </button>

                                            <button 
                                                className="cancel-button"
                                                type="button"
                                                onClick={() => setConfirmAddMembers(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {deleteMember && (
                <div className="overlay">
                    <div className="pop-up">
                        <button
                        className="close-pop-up"
                            type="button"
                            onClick={() => {setDeleteMember(false)}}
                        >
                            ✕
                        </button>

                        <form className="delete-member-form">
                            <label className="input-label">Delete Members</label>

                            <div className="available-members">
                                {existingMembers.length > 0 ? 
                                    existingMembers.map((member, index) => (
                                        <div
                                            className="member-wrapper"
                                            key={index}
                                            onClick={() => toggleDeleteMember(member)}
                                        >
                                            <img 
                                                className="profile-pic"
                                                src={`${BASE_URL}${member.profile_pic}`}
                                                alt="profile photo" 
                                            />

                                            <label>{member.username}</label>

                                            <input
                                                className="checkbox"
                                                type="checkbox"
                                                checked={
                                                    selectedDeleteMembers.some(
                                                        (selectedMember) => selectedMember.user_id === member.user_id
                                                    )
                                                }
                                                onChange={() => toggleDeleteMember(member)}
                                            />
                                        </div>
                                    ))
                                    : <label className="no-user-label">No Available Members</label>
                                }
                            </div>

                            <button
                                className="action-button"
                                type="button"
                                disabled={selectedDeleteMembers.length === 0}
                                onClick={() => setConfirmDeleteMembers(true)}
                            >
                                Remove Selected Members
                            </button>
                            
                            {confirmDeleteMembers && (
                                <div className="overlay">
                                    <div className="confirm-pop-up">
                                        <h3>Are you sure you want to remove these members?</h3>

                                        {selectedDeleteMembers.map((selected, index) => (
                                            <label key={index}>
                                                @{selected.username}
                                            </label>
                                        ))}

                                        <div className="confirm-buttons">
                                            <button
                                                className="confirm-button"
                                                type="button"
                                                onClick={handleDeleteMembers}
                                            >
                                                Yes
                                            </button>

                                            <button
                                                className="cancel-button"
                                                type="button"
                                                onClick={() => setConfirmDeleteMembers(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </form>
                    </div>
                </div>
            )}

            {deleteGroup && (
                <div className="overlay">
                    <div className="confirm-pop-up">
                        <h3>Are you sure you want to delete this group chat?</h3>

                        <label className="info-label">Deleting this group will remove all messages and members permanently.</label>

                        <div className="confirm-buttons">
                            <button
                                className="confirm-button"
                                type="button"
                                onClick={() => {
                                    handleDeleteGroup();
                                    setDeleteGroup(false);
                                }}
                            >
                                Yes
                            </button>

                            <button
                                className="cancel-button"
                                type="button"
                                onClick={() => setDeleteGroup(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {exitGroup && (
                <div className="overlay">
                    <div className="confirm-pop-up">
                        <h3>Are you sure you want to leave this group?</h3>

                        <label className="info-label">Once you leave this group, you may lose access to previous messages.</label>

                        <div className="confirm-buttons">
                            <button
                                className="confirm-button"
                                type="button"
                                onClick={() => {
                                    handleExitGroup();
                                    setExitGroup(false);
                                }}
                            >
                                Yes
                            </button>

                            <button
                                className="cancel-button"
                                type="button"
                                onClick={() => setExitGroup(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteGroupChat && (
                <div className="overlay">
                    <div className="confirm-pop-up">
                        <h3>You have been removed from this group. Delete this chat from your chat list?</h3>

                        <div className="confirm-buttons">
                            <button
                                className="confirm-button"
                                type="button"
                                onClick={() => {
                                    handleExitGroup();
                                    setDeleteGroupChat(false);
                                }}
                            >
                                Yes
                            </button>

                            <button
                                className="cancel-button"
                                type="button"
                                onClick={() => setDeleteGroupChat(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteChat && (
                <div className="overlay">
                    <div className="confirm-pop-up">
                        <h3>Are you sure you want to delete this chat?</h3>

                        <label className="info-label">Deleting this chat will remove it from your chat list.</label>

                        <div className="confirm-buttons">
                            <button
                                className="confirm-button"
                                type="button"
                                onClick={() => {
                                    handleDeleteChat();
                                    setDeleteChat(false);
                                }}
                            >
                                Yes
                            </button>

                            <button
                                className="cancel-button"
                                type="button"
                                onClick={() => setDeleteChat(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};