import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useChat } from "../context/ChatContext";
import socket from "../api/socket";

import { createNewCommunity } from "../api/sportsCommunity";
import { getCommunities } from "../api/sportsCommunity";
import { getJoinedCommunities } from "../api/sportsCommunity";
import { joinCommunity } from "../api/sportsCommunity";
import { cancelJoinRequest } from "../api/sportsCommunity";
import { editCommunityDetails } from "../api/sportsCommunity";
import { checkUserInChat } from "../api/sportsCommunity";

import CommunityPage from "./CommunityPage";

import searchIcon from "../assets/search.png";
import communityChatIcon from "../assets/chat-bubble.png";

import "../styles/SportsCommunity.css";

export default function SportsCommunity({ currentUser }){
    const { setOpenChat, setOpenOneChat } = useChat();
    
    const [search, setSearch] = useState("");
    const [showCommunities, setShowCommunities] = useState("Popular");

    // create community
    const [createCommunity, setCreateCommunity] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [communityBio, setCommunityBio] = useState("");
    const [publicity, setPublicity] = useState("");

    // load communities
    const [communities, setCommunities] = useState([]);
    const [joinedCommunities, setJoinedCommunities] = useState([]);
    const [hasMoreCommunities, setHasMoreCommunities] = useState(true);
    const [hasMoreJoinedCommunities, setHasMoreJoinedCommunities] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [openCommunity, setOpenCommunity] = useState(null);

    // edit community details
    const [editDetails, setEditDetails] = useState(null);
    const [updatedName, setUpdatedName] = useState("");
    const [updatedBio, setUpdatedBio] = useState("");
    const [updatedPublicity, setUpdatedPublicity] = useState("");


    const refresh = () => {
        setCommunities([]);
        setJoinedCommunities([]);
        setHasMoreCommunities(true);
        setHasMoreJoinedCommunities(true);

        getCommunities(currentUser.userID, 0).then(res => res.json()).then(data => {
            if (data.communities) setCommunities(data.communities);
        }).catch(() => {});
        
        getJoinedCommunities(currentUser.userID, 0).then(res => res.json()).then(data => {
            if (data.communities) setJoinedCommunities(data.communities);
        }).catch(() => {});
    };

    useEffect(() => {
        refresh();
    }, [currentUser]);

    useEffect(() => {
        socket.on("communities_updated", refresh);
        return () => {
            socket.off("communities_updated", refresh);
        };
    }, [currentUser]);

    const loadCommunities = async () => {
        
        setLoadingMore(true);

        if(hasMoreCommunities){
            let currentNoOfCommunities = communities.length;

            try{
                const response = await getCommunities(currentUser.userID, currentNoOfCommunities);
                const data = await response.json();

                if(!response.ok){
                    toast.error(data.error);
                    setLoadingMore(false);
                    return;
                }

                if (data.communities.length < 10){
                    setHasMoreCommunities(false);
                }

                setCommunities((prev) => {
                    const existingIds = new Set(prev.map(c => c.community_id));

                    const newItems = data.communities.filter(
                        c => !existingIds.has(c.community_id)
                    );

                    return [...prev, ...newItems];
                });

                setLoadingMore(false);
            }
            catch(err){
                toast.error("Network error");
                setLoadingMore(false);
            }
        }
    };

    const loadJoinedCommunities = async () => {
        setLoadingMore(true);

        if(hasMoreJoinedCommunities){
            let currentNoOfCommunities = joinedCommunities.length;

            try{
                const response = await getJoinedCommunities(currentUser.userID, currentNoOfCommunities);
                const data = await response.json();

                if(!response.ok){
                    toast.error(data.error);
                    setLoadingMore(false);
                    return;
                }
                
                if (data.communities.length < 10){
                    setHasMoreJoinedCommunities(false);
                }

                setJoinedCommunities((prev) => {
                    const existingIds = new Set(prev.map(c => c.community_id));

                    const newItems = data.communities.filter(
                        c => !existingIds.has(c.community_id)
                    );

                    return [...prev, ...newItems];
                });

                setLoadingMore(false);
            
            }
            catch(err){
                toast.error("Network error");
                setLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        if(!createCommunity){
            setCommunityName("");
            setCommunityBio("");
            setPublicity("");
        }
    }, [createCommunity]);

    const handleCreateCommunity = async (e) => {
        e.preventDefault();

        if(communityName === "" || communityBio === "" || publicity === ""){
            toast.error("Please fill in all the required details");
            return;
        }

        try {
            const response = await createNewCommunity(currentUser.userID, communityName, communityBio, publicity);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);
            setCreateCommunity(false);

            setJoinedCommunities((prev) => {
                return [
                    data.community_info,
                    ...prev
                ]
            });

            setCommunities((prev) => {
                return [
                    ...prev,
                    data.community_info
                ]
            });
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    const filteredCommunities = communities.filter(
        (community) => community.name.toLowerCase().includes(search.toLowerCase())
    );


    const filteredJoinedCommunities = joinedCommunities.filter(
        (community) => community.name.toLowerCase().includes(search.toLowerCase())
    );


    const updateJoinStatus = (list, communityID, join_status) => 
        list.map(community =>
            community.community_id === communityID
                ? { ...community, "join_status": join_status, "role": "Member" }
                : community
        );
    
    const handleJoinCommunity = async (communityInfo) => {
        try{
            const response = await joinCommunity(currentUser.userID, communityInfo);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            const join_status = communityInfo.publicity === "Private" ? "Pending" : "Joined";

            setCommunities(prev =>
                updateJoinStatus(prev, communityInfo.community_id, join_status)
            );
        }
        catch(err) {
            toast.error("Network error");
        }
    };
    

    const handleCancelRequest = async (communityID) => {
        try{
            const response = await cancelJoinRequest(currentUser.userID, communityID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setCommunities(prev => 
                updateJoinStatus(prev, communityID, "Rejected")
            )
        }
        catch(err) {
            toast.error("Network error");
        }
    };


    const handleScroll = (e) => {
        const el = e.target;

        const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;

        if(showCommunities === "Popular"){
            if (isBottom && hasMoreCommunities && !loadingMore) {
                loadCommunities();
            }
        }

        if(showCommunities === "Joined"){
            if (isBottom && hasMoreJoinedCommunities && !loadingMore) {
                loadJoinedCommunities();
            }
        }
    };

    const handleEditCommunityDetails = async (e) => {
        e.preventDefault();

        if(updatedName === "" || updatedBio === "" || updatedPublicity === ""){
            toast.error("Empty fields are not allowed");
            return;
        }

        try{
            const response = await editCommunityDetails(editDetails, updatedName, updatedBio, updatedPublicity);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            toast.success(data.success);

            const updatedCommunities = (list) => 
                list.map(community =>
                    community.community_id === editDetails.community_id
                        ? { 
                            ...community, 
                            "name": updatedName,
                            "bio": updatedBio,
                            "publicity": updatedPublicity,
                            "member_count": community.member_count + data.pending_members.length
                        }
                        : community
                );
            
            setCommunities(prev =>
                updatedCommunities(prev)
            );
            setJoinedCommunities(prev =>
                updatedCommunities(prev)
            );

            if(openCommunity && openCommunity.community_id === editDetails.community_id){
                setOpenCommunity((prev) => {
                    return {
                        ...prev,
                        "name": updatedName,
                        "bio": updatedBio,
                        "publicity": updatedPublicity
                    };
                });
            }

            setEditDetails(null);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if (!editDetails) {
            setUpdatedName("");
            setUpdatedBio("");
            setUpdatedPublicity("");
        } else {
            setUpdatedName(editDetails.name || "");
            setUpdatedBio(editDetails.bio || "");
            setUpdatedPublicity(editDetails.publicity || "");
        }
    }, [editDetails]);

    const handleOpenCommunityChange = (value) => {
        setOpenCommunity(value);
    };

    const handleEditDetailsChange = (value) => {
        setEditDetails(value);
    };

    const handleCommunitiesChange = (value) => {
        setCommunities(value);
    };

    const handleJoinedCommunitiesChange = (value) => {
        setJoinedCommunities(value);
    };

    const handleOpenChat = async (communityInfo) => {
        if(communityInfo?.role === "Admin"){
            setOpenChat(true);
            setOpenOneChat(communityInfo?.chat_id);
        }

        if(communityInfo?.role === "Member"){
            try{
                const response = await checkUserInChat(communityInfo?.chat_id, currentUser.userID);
                const data = await response.json();

                if(!response.ok){
                    toast.error(data.error);
                    return;
                }

                setOpenChat(true);
                setOpenOneChat(communityInfo?.chat_id);
            }
            catch(err) {
                toast.error("Network error");
            }
        }
    };

    return (
        <div 
            className="show-community-page"
            onScroll={handleScroll}
        >
            <h2 className="header">Sports Communities</h2>

            <div className="show-community-page-header">
                <div className="search-bar" id="community-search-bar">
                    <input 
                        className="text-input"
                        type="text"
                        placeholder="Enter community name"
                        value={search}
                        onChange={(e) => {setSearch(e.target.value)}}
                    />

                    <img src={searchIcon} alt="search" />
                </div>

                <button
                    type="button"
                    onClick={() => setCreateCommunity(true)}
                >
                    Create Community
                </button>
            </div>

            {createCommunity && (
                <div className="overlay">
                    <div className="pop-up" id="create-community-popup">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => setCreateCommunity(false)}
                        >
                            ✕
                        </button>

                        <form className="create-community-form" onSubmit={handleCreateCommunity}>
                            <label className="input-label">
                                Community Name
                                <input 
                                    className="text-input"
                                    type="text"
                                    placeholder="Enter community name"
                                    value={communityName}
                                    onChange={(e) => setCommunityName(e.target.value)}
                                />
                            </label>

                            <label className="input-label">
                                Community Bio
                                <textarea
                                    className="textarea-input"
                                    placeholder="Describe your community"
                                    value={communityBio}
                                    onChange={(e) => setCommunityBio(e.target.value)}
                                />
                            </label>

                            <div className="publicity">
                                <label className="input-label">Community Publicity</label>
                                <label className="info-label">You can change this later.</label>

                                <div className="publicity-buttons">
                                    <button
                                        className={`publicity-button ${publicity === "Public" ? "selected" : ""}`}
                                        type="button"
                                        onClick={() => setPublicity("Public")}
                                    >
                                        Public
                                    </button>

                                    <button
                                        className={`publicity-button ${publicity === "Private" ? "selected" : ""}`}
                                        type="button"
                                        onClick={() => setPublicity("Private")}
                                    >
                                        Private
                                    </button>
                                </div>
                            </div>
                            
                            <button
                                className="action-button"
                                type="submit"
                            >
                                Create Community
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="popular-joined-communities">
                <button
                    className={`popular-joined-button ${showCommunities === "Popular" ? "selected" : ""}`}
                    type="button"
                    onClick={() => setShowCommunities("Popular")}
                >
                    Popular
                </button>
                <button
                    className={`popular-joined-button ${showCommunities === "Joined" ? "selected" : ""}`}
                    type="button"
                    onClick={() => setShowCommunities("Joined")}
                >
                    Joined
                </button>
            </div>

            {showCommunities === "Popular" && (
                <div className="community-container">
                    {filteredCommunities.map((community) => (
                        <div
                            className="community-wrapper"
                            key={community.community_id}
                        >
                            <div
                                onClick={(community.publicity === "Public" || (community.publicity === "Private" && community.join_status === "Joined")) ?
                                    () => setOpenCommunity(community) 
                                    : undefined
                                }
                                style={{
                                    cursor:  (community.publicity === "Public" || (community.publicity === "Private" && community.join_status === "Joined")) ?
                                    "pointer"
                                    : "default"
                                }}
                            >
                                <div className="community-name-header">
                                    <label>{community.name}</label>

                                    <div className="community-type">
                                        {community.publicity}
                                    </div>
                                </div>

                                <p>{community.bio}</p>

                                <div className="total-members">
                                    <label>{community.member_count} members</label>
                                </div>

                                <label>
                                    Created at {new Date(community.created_at).toLocaleDateString("en-GB")}
                                </label>
                            </div>

                            <div className="join-buttons">
                                {(!community.join_status || community.join_status === "Rejected" || community.join_status === "Exited") && (
                                    <button
                                        className="join-button"
                                        type="button"
                                        onClick={() => handleJoinCommunity(community)}
                                    >
                                        Join
                                    </button>
                                )}

                                {community.join_status === "Pending" && (
                                    <button
                                        className="join-button cancel-request"
                                        type="button"
                                        onClick={() => handleCancelRequest(community.community_id)}
                                    >
                                        Cancel Request
                                    </button>
                                )}

                                {community.join_status === "Joined" && (
                                    <>
                                        {community.role === "Member" && (
                                            <button
                                                className="join-button"
                                                type="button"
                                                disabled
                                            >
                                                Joined
                                            </button>
                                        )}

                                        {community.role === "Admin" && (
                                            <button
                                                className="join-button edit-details"
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditDetails(community);
                                                }}
                                            >
                                                Edit Details
                                            </button>
                                        )}

                                        <button
                                            className="open-community-chat-button"
                                            type="button"
                                            onClick={() => handleOpenChat(community)}
                                        >
                                            <img src={communityChatIcon} alt="chat" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCommunities === "Joined" && (
                <div className="community-container">
                    {filteredJoinedCommunities.map((community) => (
                        <div
                            className="community-wrapper"
                            key={community.community_id}
                        >
                            <div
                                onClick={() => setOpenCommunity(community)}
                                style={{
                                    cursor: "pointer"
                                }}
                            >
                                <div className="community-name-header">
                                    <label>{community.name}</label>

                                    <div className="community-type">
                                        {community.publicity}
                                    </div>
                                </div>

                                <p>{community.bio}</p>

                                <div className="total-members">
                                    <label>{community.member_count} members</label>
                                </div>

                                <label>
                                    Joined at {new Date(community.join_date).toLocaleDateString("en-GB")}
                                </label>
                            </div>

                            <div className="joined-buttons">
                                {community.role === "Member" && (
                                    <button
                                        className="join-button"
                                        type="button"
                                        disabled
                                    >
                                        Joined
                                    </button>
                                )}

                                {community.role === "Admin" && (
                                    <button
                                        className="join-button edit-details"
                                        type="button"
                                        onClick={() => {
                                            setEditDetails(community);
                                            setUpdatedName(community.name);
                                            setUpdatedBio(community.bio);
                                            setUpdatedPublicity(community.publicity);
                                        }}
                                    >
                                        Edit Details
                                    </button>
                                )}

                                <button
                                    className="open-community-chat-button"
                                    type="button"
                                    onClick={() => handleOpenChat(community)}
                                >
                                    <img src={communityChatIcon} alt="chat" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editDetails && (
                <div className="overlay">
                    <div className="pop-up">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => setEditDetails(null)}
                        >
                            ✕
                        </button>

                        <form className="edit-community-form" onSubmit={handleEditCommunityDetails}>
                            <label className="input-label">
                                Community Name
                                <input 
                                    className="text-input"
                                    type="text"
                                    placeholder="Enter community name"
                                    value={updatedName || ""}
                                    onChange={(e) => setUpdatedName(e.target.value)}
                                />
                            </label>

                            <label className="input-label">
                                Community Bio
                                <textarea
                                    className="textarea-input"
                                    placeholder="Describe your community"
                                    value={updatedBio || ""}
                                    onChange={(e) => setUpdatedBio(e.target.value)}
                                />
                            </label>

                            <div>
                                <label className="input-label">Community Publicity</label>

                                <div className="publicity-buttons">
                                    <button
                                        className={`publicity-button ${updatedPublicity === "Public" ? "selected" : ""}`}
                                        type="button"
                                        onClick={() => setUpdatedPublicity("Public")}
                                    >
                                        Public
                                    </button>

                                    <button
                                        className={`publicity-button ${updatedPublicity === "Private" ? "selected" : ""}`}
                                        type="button"
                                        onClick={() => setUpdatedPublicity("Private")}
                                    >
                                        Private
                                    </button>
                                </div>
                            </div>

                            <button
                                className="action-button"
                                type="submit"
                            >
                                Save
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {openCommunity && (
                <CommunityPage
                    communityInfo={openCommunity}
                    userID={currentUser.userID}
                    setOpenCommunity={handleOpenCommunityChange}
                    setEditDetails={handleEditDetailsChange}
                    setCommunities={handleCommunitiesChange}
                    setJoinedCommunities={handleJoinedCommunitiesChange}
                    updateJoinStatus={updateJoinStatus}
                    handleJoinCommunity={handleJoinCommunity}
                />
            )}
        </div>
    );
};