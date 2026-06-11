import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import socket from "../api/socket";
import { useChat } from "../context/ChatContext";

import { getRequests } from "../api/sportsCommunity";
import { approveRequest } from "../api/sportsCommunity";
import { rejectRequest } from "../api/sportsCommunity";
import { getOtherUsers } from "../api/sportsCommunity";
import { addCommunityMembers } from "../api/sportsCommunity";
import { getExistingMembers } from "../api/sportsCommunity";
import { deleteMembers } from "../api/sportsCommunity";
import { deleteCommunity } from "../api/sportsCommunity";
import { leaveCommunity } from "../api/sportsCommunity";

import CommunityReport from "./CommunityReport";
import CommunityPosts from "./CommunityPosts";

import requestsIcon from "../assets/joinRequests.png";
import manageMembersIcon from "../assets/manageMembers.png";
import reportIcon from "../assets/report.png";
import moreActionsIcon from "../assets/dots.png";
import searchIcon from "../assets/search.png";

import "../styles/CommunityPage.css";

export default function CommunityPage({ communityInfo, userID, setOpenCommunity, setEditDetails, setCommunities, setJoinedCommunities, updateJoinStatus, handleJoinCommunity }){
    const BASE_URL = "http://localhost:5000/community";

    const { openOneChat, setOpenOneChat } = useChat();

    const [memberCount, setMemberCount] = useState(0);

    const [viewRequests, setViewRequests] = useState(false);
    const [requests, setRequests] = useState([]);
    const [manageMembers, setManageMembers] = useState(false);
    const [viewReport, setViewReport] = useState(false);
    const [moreActions, setMoreActions] = useState(false);

    const [addMembers, setAddMembers] = useState(false);
    const [removeMembers, setRemoveMembers] = useState(false);
    const [search, setSearch] = useState("");

    const [otherUsers, setOtherUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [confirmAddMembers, setConfirmAddMembers] = useState(false);

    const [existingMembers, setExistingMembers] = useState([]);
    const [selectedDeleteMembers, setSelectedDeleteMembers] = useState([]);
    const [confirmDeleteMembers, setConfirmDeleteMembers] = useState(false);

    const [confirmDeleteCommunity, setConfirmDeleteCommunity] = useState(false);
    const [confirmLeaveCommunity, setConfirmLeaveCommunity] = useState(false);

    const [joinStatus, setJoinStatus] = useState("");

    const loadRequests = async () => {
        try{
            const response = await getRequests(communityInfo?.community_id);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setRequests(data.requests);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(communityInfo?.role === "Admin" && communityInfo?.publicity === "Private"){
            loadRequests();
        }

        setMemberCount(communityInfo?.member_count);
        setJoinStatus(communityInfo?.join_status);
    }, [communityInfo]);

    useEffect(() => {
        const handleUpdate = () => {
            if (communityInfo?.role === "Admin" && communityInfo?.publicity === "Private") {
                loadRequests();
            }
            if (addMembers) {
                loadOtherUsers();
            }
            if (removeMembers) {
                loadExistingMembers();
            }
        };

        socket.on("communities_updated", handleUpdate);
        return () => {
            socket.off("communities_updated", handleUpdate);
        };
    }, [communityInfo, addMembers, removeMembers]);

    const handleApproveRequest = async (request) => {
        try{
            const response = await approveRequest(request, communityInfo?.chat_id, communityInfo?.name);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setRequests(prev =>
                prev.filter(
                    (prevRequest) => prevRequest.member_id !== request.member_id
                )
            );

            setMemberCount(prev => prev + 1);
            setCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count + 1
                    }
                    : community
                )
            );
            setJoinedCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count + 1
                    }
                    : community
                )
            );

        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleRejectRequest = async (requestInfo) => {
        try{
            const response = await rejectRequest(requestInfo,  communityInfo?.name);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setRequests(prev =>
                prev.filter(
                    (prevRequest) => prevRequest.member_id !== requestInfo.member_id
                )
            );
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(addMembers){
            loadOtherUsers();
        }

        if(!addMembers){
            setSearch("");
            setOtherUsers([]);
            setSelectedUsers([]);
        }
    }, [addMembers]);

    const loadOtherUsers = async () => {
        try{
            const response = await getOtherUsers(communityInfo?.community_id);
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
    };


    const filteredUsers = otherUsers.filter(
        (user) => user.username.toLowerCase().includes(search.toLowerCase())
    );


    const handleSelectUser = (userID, username, profilePic) => {
        if(selectedUsers.some(
            (selectedUser) => selectedUser.userID === userID
        )){
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
        setSelectedUsers(prev => 
            prev.filter(
                (selectedUser) => selectedUser.userID !== userID
            )
        );
    };

    const handleAddMembers = async (e) => {
        e.preventDefault();

        try{
            const response = await addCommunityMembers(selectedUsers, communityInfo);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setMemberCount(prev => prev + selectedUsers.length);

            setCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count + selectedUsers.length
                    }
                    : community
                )
            );
            setJoinedCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count + selectedUsers.length
                    }
                    : community
                )
            );

            setConfirmAddMembers(false);
            setAddMembers(false);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const loadExistingMembers = async () => {
        try{
            const response = await getExistingMembers(communityInfo?.community_id);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setExistingMembers(data.existing_members);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if(removeMembers){
            loadExistingMembers();
        }

        if(!removeMembers){
            setExistingMembers([]);
            setSelectedDeleteMembers([]);
        }
    }, [removeMembers]);

    const toggleDeleteMember = (member) => {
        if(selectedDeleteMembers.some(
            (selectedMember) => selectedMember.userID === member.user_id
        )){
            setSelectedDeleteMembers(prev =>
                prev.filter(
                    (selected) => selected.userID !== member.user_id
                )
            );
        }

        else{
            setSelectedDeleteMembers((prev) => {
                return [
                    ...prev,
                    {
                        "userID": member.user_id,
                        "username": member.username,
                        "profilePic": member.profile_pic
                    }
                ];
            });
        }
    };

    const handleDeleteMembers = async () => {
        try{
            const response = await deleteMembers(selectedDeleteMembers, communityInfo);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setMemberCount(prev => prev - selectedDeleteMembers.length);

            setCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count - selectedDeleteMembers.length
                    }
                    : community
                )
            );
            setJoinedCommunities((prev) => 
                prev.map((community) => 
                    community.community_id === communityInfo.community_id
                    ? {
                        ...community,
                        "member_count": community.member_count - selectedDeleteMembers.length
                    }
                    : community
                )
            );

            setConfirmDeleteMembers(false);
            setRemoveMembers(false);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleDeleteCommunity = async () => {
        try{
            const response = await deleteCommunity(communityInfo);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setConfirmDeleteCommunity(false);
            setOpenCommunity(null);

            setCommunities(prev =>
                prev.filter(
                    (community) => community.community_id !== communityInfo?.community_id
                )
            );

            setJoinedCommunities(prev =>
                prev.filter(
                    (community) => community.community_id !== communityInfo?.community_id
                )
            );

            if(openOneChat === communityInfo.chat_id){
                setOpenOneChat(null);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleLeaveCommunity = async () => {
        try{
            const response = await leaveCommunity(communityInfo, userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setConfirmLeaveCommunity(false);

            if(communityInfo?.publicity === "Private") setOpenCommunity(null);

            if(communityInfo?.publicity === "Public") setJoinStatus("Exited");

            setCommunities(prev =>
                updateJoinStatus(prev, communityInfo?.community_id, "Exited")
            );

            setJoinedCommunities(prev =>
                prev.filter(
                    (community) => community.community_id !== communityInfo?.community_id
                )
            );

            setMoreActions(false);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleViewReportChange = (value) => {
        setViewReport(value);
    };

    const handleScroll = (e) => {
        const el = e.target;

        const isBottom =
            el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

        if (isBottom) {
            window.dispatchEvent(new Event("loadCommunityPosts"));
        }
    };

    return (
        <div className="community-page">
            <div 
                className="community-page-content"
                onScroll={handleScroll}
            >
                <div className="community-header-background">
                    <div className="community-page-header">
                        <div className="header-left">
                            <button
                                className="community-back-button"
                                type="button"
                                onClick={() => setOpenCommunity(null)}
                            >
                                {"<"}
                            </button>

                            <label className="header-community-name">
                                {communityInfo?.name}
                            </label>

                            <div className="total-member-count">
                                <label>{memberCount} members</label>
                            </div>
                        </div>

                        <div className="header-right">
                            {communityInfo?.role === "Admin" && (
                                <>
                                    {communityInfo?.publicity === "Private" && (
                                        <div className="header-button-wrapper">
                                            <button
                                                className="requests-button"
                                                type="button"
                                                onClick={() => setViewRequests(true)}
                                            >
                                                <img src={requestsIcon} alt="join requests" />
                                            </button>

                                            <label className="header-button-label">
                                                Join Requests
                                            </label>

                                            {requests.length > 0 && (
                                                <span className="requests-count">
                                                    {requests.length}
                                                </span>
                                            )}
                                            
                                        </div>
                                    )}

                                    <div className="header-button-wrapper">
                                        <button
                                            type="button"
                                            onClick={() => setManageMembers(!manageMembers)}
                                        >
                                            <img src={manageMembersIcon} alt="manage members" />
                                        </button>

                                        <label className="header-button-label">
                                            Manage Members
                                        </label>
                                    </div>

                                    <div className="header-button-wrapper">
                                        <button
                                            type="button"
                                            onClick={() => setViewReport(true)}
                                        >
                                            <img src={reportIcon} alt="manage members" />
                                        </button>

                                        <label className="header-button-label">
                                            Community Report
                                        </label>
                                    </div>
                                </>
                            )}

                            {joinStatus === "Joined" && (
                                <div className="header-button-wrapper">
                                    <button
                                        type="button"
                                        onClick={() => setMoreActions(!moreActions)}
                                    >
                                        <img src={moreActionsIcon} alt="more actions" />
                                    </button>
                                </div>
                            )}

                            {joinStatus !== "Joined" && (
                                <button
                                    className="join-community-button"
                                    type="button"
                                    onClick={() => {
                                        handleJoinCommunity(communityInfo);
                                        setJoinStatus("Joined");
                                    }}
                                >
                                    Join
                                </button>
                            )}
                            
                        </div>

                        {viewRequests && (
                            <div className="overlay">
                                <div className="pop-up">
                                    <button
                                        className="close-pop-up"
                                        type="button"
                                        onClick={() => setViewRequests(false)}
                                    >
                                        ✕
                                    </button>

                                    <div className="request-container">
                                        {requests.length > 0 && requests.map((request) => (
                                            <div
                                                className="request-wrapper"
                                                key={request.member_id}
                                            >
                                                <div className="request-left">
                                                    <img src={`${BASE_URL}${request.profile_pic}`} alt="profile photo" />

                                                    <label className="request-username">
                                                        {request.username}
                                                    </label>
                                                </div>

                                                <div className="approve-reject-buttons">
                                                    <button
                                                        className="approve-button"
                                                        type="button"
                                                        onClick={() => handleApproveRequest(request)}
                                                    >
                                                        ✓
                                                    </button>

                                                    <button
                                                        className="reject-button"
                                                        type="button"
                                                        onClick={() => handleRejectRequest(request)}
                                                    >
                                                        ✗
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {requests.length === 0 && (
                                            <label className="no-request-label">No join requests</label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {manageMembers && (
                            <>
                                <div className="manage-members-dropdown">
                                    <button
                                        type="button"
                                        onClick={() => setAddMembers(true)}
                                    >
                                        Add Members
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setRemoveMembers(true)}
                                    >
                                        Remove Members
                                    </button>
                                </div>

                                {addMembers && (
                                    <div className="overlay">
                                        <div className="pop-up">
                                            <button
                                                className="close-pop-up"
                                                type="button"
                                                onClick={() => {setAddMembers(false)}}
                                            >
                                                ✕
                                            </button>
                    
                                            <form className="add-member-form">
                                                <label className="input-label">
                                                    Add Community Members
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
                                                            : <label className="no-user-label">No User Found</label>
                                                        } 
                                                    </div>
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
                                                            <h3>Are you sure you want to add these users?</h3>
                    
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

                                {removeMembers && (
                                    <div className="overlay">
                                        <div className="pop-up">
                                            <button
                                            className="close-pop-up"
                                                type="button"
                                                onClick={() => {setRemoveMembers(false)}}
                                            >
                                                ✕
                                            </button>

                                            <form className="delete-member-form">
                                                <label className="input-label">Delete Members</label>

                                                <div className="available-members">
                                                    {existingMembers.length > 0 ? 
                                                        existingMembers.map((member) => (
                                                            <div
                                                                className="member-wrapper"
                                                                key={member.user_id}
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
                                                                            (selectedMember) => selectedMember.userID === member.user_id
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        ))
                                                        : <label>No members to removed</label>
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
                            </>
                        )}

                        {moreActions && (
                            <div className="more-actions-dropdown">
                                {communityInfo?.role === "Admin" && (
                                    <>
                                        <button 
                                            className="more-actions-button"
                                            type="button"
                                            onClick={() => setEditDetails(communityInfo)}
                                        >
                                            Edit Community Details
                                        </button>

                                        <button
                                            className="more-actions-button danger"
                                            type="button"
                                            onClick={() => setConfirmDeleteCommunity(true)}
                                        >
                                            Delete Community
                                        </button>
                                    </>
                                )}

                                {(communityInfo?.role === "Member" && joinStatus === "Joined") && (
                                    <button
                                        className="more-actions-button danger"
                                        type="button"
                                        onClick={() => setConfirmLeaveCommunity(true)}
                                    >
                                        Leave Community
                                    </button>
                                )}
                            </div>
                        )}

                        {confirmDeleteCommunity && (
                            <div className="overlay">
                                <div className="confirm-pop-up">
                                    <h3>Are you sure you want to delete this community?</h3>

                                    <label className="info-label">
                                        This action cannot be undone.
                                    </label>

                                    <div className="confirm-buttons">
                                        <button
                                            className="confirm-button"
                                            type="button"
                                            onClick={() => handleDeleteCommunity()}
                                        >
                                            Yes
                                        </button>

                                        <button
                                            className="cancel-button"
                                            type="button"
                                            onClick={() => setConfirmDeleteCommunity(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {confirmLeaveCommunity && (
                            <div className="overlay">
                                <div className="confirm-pop-up">
                                    <h3>Are you sure you want to leave this community?</h3>

                                    {communityInfo?.publicity === "Private" && (
                                        <label className="info-label">
                                            You have to request again to join once you left.
                                        </label>
                                    )}

                                    <div className="confirm-buttons">
                                        <button
                                            className="confirm-button"
                                            type="button"
                                            onClick={() => handleLeaveCommunity()}
                                        >
                                            Yes
                                        </button>

                                        <button
                                            className="cancel-button"
                                            type="button"
                                            onClick={() => setConfirmLeaveCommunity(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bio-wrapper">
                    <div className="community-bio">
                        <p>{communityInfo?.bio}</p>
                    </div>
                </div>
                
                <CommunityPosts 
                    communityInfo={communityInfo}
                    userID={userID}
                />
        
            </div>

            {viewReport && (
                <CommunityReport 
                    communityID={communityInfo?.community_id}
                    setViewReport={handleViewReportChange}
                />
            )}
        </div>
    );
};