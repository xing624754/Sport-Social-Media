import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { Heart, MessageCircle,Images, X } from "lucide-react";
import ReportModal from "../components/ReportModal";
import { openPrivateChat } from "../api/chat";
import { followUser, unfollowUser } from "../api/people";
import { useChat } from "../context/ChatContext";

import "../styles/UserProfile.css";


function UserProfile({currentUser}) {

    const { setOpenChat, setOpenOneChat } = useChat();

    const { userId } = useParams();

    const [posts, setPosts] = useState([]);

    const [favoritePosts, setFavoritePosts] = useState([]);

    const [activeTab, setActiveTab] = useState("posts");
    
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReport, setShowReport] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // Modal List States
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalUsers, setModalUsers] = useState([]);

    const defaultProfilePic = "/uploads/profile_pics/user.png";
    
    const isOwnProfile =
    !userId ||
    Number(userId) === Number(currentUser?.userID);

    // FETCH PROFILE
    const fetchUserProfile = async (id) => {

        try {

            const response = await axios.get(
                `/api/profile/${id}`
            );

            console.log(response.data);

            setProfile(response.data.user); // update profile state
            setIsFollowing(response.data.user.is_following); // remember follow state
            

        } catch (error) {

            console.log(error);

        }

    };

    // FETCH POSTS
    const fetchUserPosts = async (id) => {

        try {

            const response = await axios.get(
                `/api/user-posts/${id}`
            );

            setPosts(response.data.posts || []);

        } catch (error) {

            console.log(error);

        }

    };

    // FETCH FAVORITE POSTS
    const fetchFavoritePosts = async (id) => {

        try {

            const response = await axios.get(
                `/api/favorite-posts/${id}`
            );

            setFavoritePosts(response.data.favorite_posts || []) ;

        } catch (error) {

            console.log(error);

        }

    };

    // FETCH FOLLOWERS FOR MODAL
    const handleOpenFollowers = async () => {
        const profileId = userId || currentUser?.userID;
        try {
            const response = await axios.get(`/api/user-followers/${profileId}`);
            setModalTitle("Followers");
            setModalUsers(response.data.followers || []);
            setModalOpen(true);
        } catch (error) {
            console.log(error);
        }
    };

    // FETCH FOLLOWING FOR MODAL
    const handleOpenFollowing = async () => {
        const profileId = userId || currentUser?.userID;
        try {
            const response = await axios.get(`/api/user-following/${profileId}`);
            setModalTitle("Following");
            setModalUsers(response.data.following || []);
            setModalOpen(true);
        } catch (error) {
            console.log(error);
        }
    };

    // LOAD DATA

    useEffect(() => {

        // Reset modal when navigating to a different profile
        setModalOpen(false);
        setModalUsers([]);

        const loadData = async () => {

            try {

                const profileId =
                    userId || currentUser?.userID;
                
                if (!profileId) return;

                if (!isOwnProfile) {
                    setActiveTab("posts");
                }

                await fetchUserProfile(profileId);

                await fetchUserPosts(profileId);

                if (isOwnProfile) {

                    await fetchFavoritePosts(profileId);

                }

            } catch (error) {

                console.log(error);

            } finally {
                setLoading(false);
            }

        };

        if (currentUser || userId) {
            loadData();
        }

    }, [userId, currentUser, isOwnProfile]);

    const handleOpenChat = async (userID) => {

        try{
            const response = await openPrivateChat(currentUser.userID, userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setOpenChat(true);
            setOpenOneChat(data.chat_id);
        }
        catch(err) {
            toast.error("Network error");
        }
    
    };



    // FOLLOW / UNFOLLOW USER (toggle)
    const handleFollow = async () => {
        try {
            const response = isFollowing
                ? await unfollowUser(userId)
                : await followUser(userId);
            if (response.ok) {
                setIsFollowing(!isFollowing);
                setProfile((prev) =>
                    prev
                        ? { ...prev, follower_count: prev.follower_count + (isFollowing ? -1 : 1) }
                        : prev
                );
            }
        } catch (error) {
            // ignore - user can try again
        }
    };

    if (loading) {
        return <div className="profileLoading">Loading profile...</div>;
    }

    const profileImage = profile?.profile_pic
        ? `${profile.profile_pic}?t=${Date.now()}`
        : defaultProfilePic;

    // CHECK OWN PROFILE
    return (
    
        <div className="profileContainer">

            {/* TOP SECTION */}

            <div className="profileTopSection">

                <img
                    src={profileImage}
                    alt="profile"
                    className="profileImage"
                    onError={(e) => {
                        e.target.onerror =null;
                        e.target.src = defaultProfilePic;
                    }}
                />

                <div className="profileInfo">

                    <div className="profileHeader">

                        <div className="profileNameSection">

                            <div className="profileNameRow">

                                <h1>{profile?.username}</h1>

                                {isOwnProfile && (

                                    <button onClick={() => navigate("/user/edit-profile")}
                                        className="editProfileBtn">
                                        Edit Profile                                                         
                                    </button>

                                )}

                            </div>

                            <div className="profileSubHeaderRow">
                                <p className="profileHandleText">@{profile?.username}</p>
                                {profile?.age !== null && profile?.age !== undefined && (
                                    <span className="profileAgeTag">{profile?.age} </span>
                                )}
                            </div>

                        </div>

                        {!isOwnProfile && (

                            <div className="profileBtn">

                                <button className="followBtn" onClick={handleFollow}>

                                    {isFollowing ? "Unfollow" : "Follow"}

                                </button>

                                <button 
                                    className="messageBtn"
                                    onClick={() => handleOpenChat(profile.user_id)}
                                >

                                    Message

                                </button>

                                <button className="reportBtn" onClick={() => setShowReport(true)}>

                                    Report

                                </button>

                            </div>

                        )}

                    </div>

                    {/* STATS */}

                    <div className="profileStats">

                        <div className="statCard">

                            <h3>Posts</h3>

                            <p>{profile?.post_count}</p>

                        </div>

                        <div className="statCard clickableStat" onClick={handleOpenFollowers}>

                            <h3>Followers</h3>

                            <p>{profile?.follower_count}</p>

                        </div>

                        <div className="statCard clickableStat" onClick={handleOpenFollowing}>

                            <h3>Following</h3>

                            <p>{profile?.following_count}</p>

                        </div>

                        <div className="statCard">

                            <h3>Favorites</h3>

                            <p>{profile?.favorite_count}</p>

                        </div>

                    </div>

                    {/* TAGS */}

                    <div className="profileTags">

                        {profile?.tags?.map((tag, index) => (

                            <span
                                className="tag"
                                key={index}
                            >
                                {tag.sport} • {tag.skill_level}
                            </span>

                        ))}

                    </div>


                </div>

            </div>

            {/* POSTS */}

            <div className="profileSection">

                {/* PROFILE TABS */}

                <div className="profileTabs">

                    <button
                        className={`tabBtn ${
                            activeTab === "posts"
                                ? "activeTab"
                                : ""
                        }`}
                        onClick={() => setActiveTab("posts")}
                    >
                        Posts
                    </button>

                    {isOwnProfile ? (

                        <button
                            className={`tabBtn ${
                                activeTab === "favorites"
                                    ? "activeTab"
                                    : ""
                            }`}
                            onClick={() => setActiveTab("favorites")}
                        >
                            Favorites
                        </button>

                    ) : (

                        <button className="tabBtn lockedTab">
                            🔒 Favorites
                        </button>

                    )}

                </div>

            </div>

            {/* FAVORITE POSTS ONLY OWN PROFILE */}
                <div className="postsGrid">

                    {(activeTab === "posts"
                        ? posts
                        : favoritePosts
                    ).map((post) => (

                        <div
                            className="postCard"
                            key={post.post_id}
                            onClick={() => {
                                if (isOwnProfile) {
                                    navigate(`/user/post/${post.post_id}`);
                                } else {
                                    navigate(`/user/post/${post.post_id}`);
                                }
                            }}
                            style={{ cursor: "pointer" }}
                        >
                            {post.is_pending_review && (
                                <div className="pendingReviewBadge">
                                    ⚠️ Pending Review
                                </div>
                            )}

                            {post.media && post.media.length > 0 ? (
                                <>
                                    {/* IMAGE OR VIDEO */}
                                    {post.media[0].endsWith(".mp4") ? (

                                        <video
                                            src={post.media[0]}
                                            className="postImage"
                                            muted
                                            playsInline
                                        />

                                    ) : (

                                        <img
                                            src={post.media[0]}
                                            alt=""
                                            className="postImage"
                                        />

                                    )}

                                    {/* MULTIPLE MEDIA INDICATOR */}
                                    {post.media.length > 1 && (
                                        <div className="multiMediaIcon">
                                            <Images size={25} />
                                        </div>
                                    )}

                                    <div className="postOverlay">
                                        <div className="overlayContent">
                                            <span><Heart size={18}/> {post.likes}</span>
                                            <span><MessageCircle size={18}/> {post.comments}</span>
                                        </div>
                                    </div>
                                </>

                            ):(
                                <div className="noImagePost">
                                    <p>{post.caption}</p>
                                </div>

                            )}

                        </div>

                    ))}

                </div>

            {/* STATS MODAL OVERLAY SHEET */}
            {modalOpen && (
                <div className="statsModalOverlay" onClick={() => setModalOpen(false)}>
                    <div className="statsModalContent" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="statsModalHeader">
                            <div className="headerSpacer"></div>
                            <h2>{modalTitle}</h2>
                            <button className="closeModalBtn" onClick={() => setModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>



                        <div className="statsModalBody">
                            {modalUsers.length === 0 ? (
                                <p className="emptyModalText">No users found.</p>
                            ) : (
                                modalUsers.map((userRow) => (
                                    <div 
                                        key={userRow.user_id} 
                                        className="modalUserRow"
                                        onClick={() => {
                                            // Close modal immediately to prevent race condition on remount
                                            setModalOpen(false);
                                            // Navigate after state is updated
                                            navigate(`/user/profile/${userRow.user_id}`);
                                        }}
                                    >
                                        <img 
                                            src={userRow.profile_pic || defaultProfilePic} 
                                            alt={userRow.username} 
                                            className="modalUserImg" 
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = defaultProfilePic;
                                            }}
                                        />
                                        
                                        <div className="modalUserMeta">
                                            <span className="modalUsername">{userRow.username}</span>
                                            <span className="modalFullName">User Name Details</span>
                                        </div>

                                        {/* INSTAGRAM ACTION BUTTON */}
                                        <button 
                                            className={`modalActionBtn ${modalTitle === "Following" ? "followingMode" : "followerMode"}`}
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents row navigation when managing status buttons
                                            }}
                                        >
                                            {modalTitle === "Following" ? "Following" : "Remove"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showReport && (
                <ReportModal
                    person={{ user_id: userId, username: profile?.username }}
                    onClose={() => setShowReport(false)}
                />
            )}

        </div>

    );
}

export default UserProfile;