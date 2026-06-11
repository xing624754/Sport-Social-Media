import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import UserLayout from "./UserLayout";
import { getPeople, followUser, unfollowUser, searchPeople } from "../api/people";
import { getCommunities } from "../api/community";
import { getHomeFeed, searchPosts } from "../api/homeFeed";
import { toggleLike, toggleFavorite } from "../api/posts";
import { getAds } from "../api/advertisement";
import { joinCommunity } from "../api/sportsCommunity";
import { cancelJoinRequest } from "../api/sportsCommunity";
import { toast } from "react-toastify";
import PostModal from "../components/PostModal";
import ReportModal from "../components/ReportModal";
import PostCarousel from "../components/PostCarousel";
import socket from "../api/socket";
import "../styles/UserHomepage.css";

// The 3 tabs on the homepage feed
const TABS = [
    { key: "recommended", label: "Recommended" },
    { key: "following", label: "Following" },
    { key: "community", label: "Community" }
];

// The message shown when a tab has no posts.
const EMPTY_MESSAGES = {
    recommended: "No posts yet. Posts will show up here once people start sharing.",
    following: "You haven't followed anyone yet. Follow people to see their posts here.",
    community: "You haven't joined any community yet. Join a community to see its posts here."
};

function UserHomepage({ currentUser }) {
    // open another page when the user clicks a person.
    const navigate = useNavigate();
    const location = useLocation();

    // Check if user just created a post (redirected from CreatePost)
    const [justCreatedPost, setJustCreatedPost] = useState(location.state?.justCreatedPost || false);

    const peopleScrollRef = useRef(null);
    const communityScrollRef = useRef(null);

    const handleScrollClick = (ref, direction) => {
        if (ref.current) {
            const scrollAmount = 240;
            ref.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            });
        }
    };

    // Which tab is selected (recommended / following / community)
    const [activeTab, setActiveTab] = useState("recommended");

    // The posts shown in the feed.
    const [posts, setPosts] = useState([]);

    // The ads shown between posts (one ad after every 5 posts).
    const [ads, setAds] = useState([]);

    // The people shown in the "People" box.
    const [people, setPeople] = useState([]);

    // People-box username search
    const [peopleSearch, setPeopleSearch] = useState("");
    const [peopleResults, setPeopleResults] = useState([]);
    const [peopleSearched, setPeopleSearched] = useState(false);

    // The communities shown in the "Community" box .
    const [communities, setCommunities] = useState([]);

    // Which post's comment popup is open (null = none open).
    const [openPostId, setOpenPostId] = useState(null);

    // Which post is being reported (null = report popup closed).
    const [postToReport, setPostToReport] = useState(null);

    // Search box text, results view vs normal feed view.
    const [searchQuery, setSearchQuery] = useState("");
    const [searchActive, setSearchActive] = useState(false);

    // Which posts have their full description expanded (keyed by post_id).
    const [expandedPosts, setExpandedPosts] = useState({});

    // Number of unseen new posts from other users
    const [newPostsCount, setNewPostsCount] = useState(0);

    // Socket listener for new posts
    useEffect(() => {
        if (!currentUser?.userID) return;

        const handleNewPost = (data) => {
            if (data.user_id !== currentUser.userID) {
                setNewPostsCount((prev) => prev + 1);
            }
        };

        socket.on("new_post_created", handleNewPost);
        return () => {
            socket.off("new_post_created", handleNewPost);
        };
    }, [currentUser?.userID]);

    // Reload the feed whenever the user switches tab.
    useEffect(() => {
        setNewPostsCount(0);
        loadPosts(activeTab, !justCreatedPost);
        if (justCreatedPost) {
            setJustCreatedPost(false);
            window.history.replaceState({}, document.title);
        }
    }, [activeTab]);

    const handleLoadNewPosts = () => {
        setNewPostsCount(0);
        loadPosts(activeTab, true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Load the "People" list and the ads once, when the page first opens.
    useEffect(() => {
        loadPeople();
        loadAds();
        loadCommunities();
    }, []);

    // Ask the backend (GET /api/ads) for the active ads.
    async function loadAds() {
        try {
            const response = await getAds();
            const data = await response.json();
            setAds(data.data || []);
        } catch (err) {
            // if no ads,the feed will just show posts.
            setAds([]);
        }
    }

    // Ask the backend (GET) for a list of people the user can view.
    async function loadPeople() {
        try {
            const response = await getPeople();
            const data = await response.json();
            setPeople(data.data || []);
        } catch (err) {
            setPeople([]);
        }
    }

    // Search users by username for the People box. 
    // Empty will back to recommendations.
    async function handlePeopleSearch(e) {
        e.preventDefault();
        const q = peopleSearch.trim();
        if (!q) {
            setPeopleSearched(false);
            setPeopleResults([]);
            return;
        }
        try {
            const response = await searchPeople(q);
            const data = await response.json();
            setPeopleResults(data.data || []);
            setPeopleSearched(true);
        } catch (err) {
            // ignore - user can try again
        }
    }

    // Click the Follow button on a person in the right sidebar.
    // reload the list so fresh recommendations and skips people that already follow.
    async function handleFollow(targetUserId) {
        try {
            const response = await followUser(targetUserId);
            if (response.ok) {
                await loadPeople();
            }
        } catch (err) {
            // Ignore - the row stays, user can try again.
        }
    }

    // Follow/unfollow toggle for the People box (recommendations + search results).
    // Flips is_following locally so the button — and a repeat search — show the right state.
    async function handlePersonFollow(person) {
        try {
            const response = person.is_following
                ? await unfollowUser(person.user_id)
                : await followUser(person.user_id);
            if (response.ok) {
                const flip = (list) =>
                    list.map((p) =>
                        p.user_id === person.user_id
                            ? { ...p, is_following: !p.is_following }
                            : p
                    );
                setPeopleResults((prev) => flip(prev));
                setPeople((prev) => flip(prev));
            }
        } catch (err) {
            // Ignore - user can try again.
        }
    }

    // Ask the backend for the top public communities to recommend.
    async function loadCommunities() {
        try {
            const response = await getCommunities();
            const data = await response.json();
            setCommunities(data.communities || []);
        } catch (err) {
            setCommunities([]);
        }
    }

    // Click the Join button on a community in the right sidebar.
    // If the backend says OK, reload the list so fresh recommendations
    // and skips communities that already joined.
    async function handleJoin(communityId) {
        try {
            const response = await joinCommunity(communityId);
            if (response.ok) {
                await loadCommunities();
            }
        } catch (err) {
            // Ignore - the row stays.
        }
    }

    const updateJoinStatus = (list, communityID, join_status) =>
        list.map(community =>
            community.community_id === communityID
                ? { ...community, "join_status": join_status }
                : community
        );

    const handleJoinCommunity = async (communityInfo) => {
        try {
            const response = await joinCommunity(currentUser.userID, communityInfo);
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error);
                return;
            }

            const join_status = communityInfo.publicity === "Private" ? "Pending" : "Joined";

            setCommunities(prev =>
                updateJoinStatus(prev, communityInfo.community_id, join_status)
            );
        }
        catch (err) {
            toast.error("Network error");
        }
    };

    const handleCancelRequest = async (communityID) => {
        try {
            const response = await cancelJoinRequest(currentUser.userID, communityID);
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error);
                return;
            }

            setCommunities(prev =>
                updateJoinStatus(prev, communityID, "Rejected")
            )
        }
        catch (err) {
            toast.error("Network error");
        }
    };

    // Click the heart on a post - toggle like, update the UI right away.
    async function handleLike(postId) {
        try {
            const response = await toggleLike(postId);
            const data = await response.json();
            if (response.ok) {
                setPosts(posts.map((p) =>
                    p.post_id === postId
                        ? {
                            ...p,
                            is_liked: data.liked,
                            num_of_like: p.num_of_like + (data.liked ? 1 : -1)
                        }
                        : p
                ));
                // ads are posts too — keep the ad card's like state in sync
                setAds(ads.map((a) =>
                    a.advertisement_id === postId
                        ? {
                            ...a,
                            is_liked: data.liked,
                            num_of_like: a.num_of_like + (data.liked ? 1 : -1)
                        }
                        : a
                ));
            }
        } catch (err) {
            // Ignore - user can try again.
        }
    }

    // Click the bookmark on a post - toggle favorite.
    async function handleFavorite(postId) {
        try {
            const response = await toggleFavorite(postId);
            const data = await response.json();
            if (response.ok) {
                setPosts(posts.map((p) =>
                    p.post_id === postId
                        ? { ...p, is_favorited: data.favorited }
                        : p
                ));
                setAds(ads.map((a) =>
                    a.advertisement_id === postId
                        ? { ...a, is_favorited: data.favorited }
                        : a
                ));
            }
        } catch (err) {
            // Ignore.
        }
    }

    // share button 
    // copy the post link
    async function handleShare(postId) {
        const link = `${window.location.origin}/user/post/${postId}`;
        try {
            await navigator.clipboard.writeText(link);
            toast.success("Link copied!");
        } catch (err) {
            toast.error("Could not copy link");
        }
    }

    // ask the backend for the posts to show in the feed, based on which tab is active.
    async function loadPosts(tab, excludeSelf = true) {
        try {
            const response = await getHomeFeed(tab, excludeSelf);
            const data = await response.json();
            setPosts(data.data || []);
        } catch (err) {
            // Could not reach the server so leave the feed empty.
            setPosts([]);
        }
    }

    // Search: show posts whose title/description matches what the user typed.
    async function handleSearch(e) {
        e.preventDefault();
        const keyword = searchQuery.trim();
        if (!keyword) return;   // ignore an empty search

        try {
            const response = await searchPosts(keyword);
            const data = await response.json();
            setPosts(data.data || []);
        } catch (err) {
            setPosts([]);
        }
        setSearchActive(true);   // switch to the "results" view
    }

    // Clear the search and go back to the normal feed.
    function clearSearch() {
        setSearchQuery("");
        setSearchActive(false);
        loadPosts(activeTab, true);
    }

    // Show/hide the full description for one post 
    // the "...more" button.
    function toggleExpand(postId) {
        setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
    }

    // A description is "long" (needs a more button) 
    // if it has lots of text or many lines.
    function isLongDescription(desc) {
        if (!desc) return false;
        return desc.length > 150 || desc.split("\n").length > 4;
    }

    return (
        <>
            <div className="userHomeLayout">
                {/* Middle column: tabs + posts */}
                <div className="mainContent">

                    {/* Search bar - finds posts by words in their title or description */}
                    <form className="postSearchBar" onSubmit={handleSearch}>
                        <input
                            className="postSearchInput"
                            type="text"
                            placeholder="Search posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="postSearchBtn">Search</button>
                    </form>

                    {/* When searching, show a results header; otherwise show the tabs. */}
                    {searchActive ? (
                        <div className="searchResultHeader">
                            <span>Results for "{searchQuery}"</span>
                            <button className="clearBtn" onClick={clearSearch}>Clear</button>
                        </div>
                    ) : (
                        <div className="tabBar">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    className={`tabBtn ${activeTab === tab.key ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* New posts banner/button like Twitter */}
                    {newPostsCount > 5 && (
                        <div className="newPostsBannerContainer">
                            <button className="newPostsBannerBtn" onClick={handleLoadNewPosts}>
                                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_upward</span>
                                {newPostsCount} new posts. Click to view!
                            </button>
                        </div>
                    )}

                    {/* Mobile suggestions horizontal scroll */}
                    {(people.length > 0 || communities.length > 0) && (
                        <div className="mobileSuggestions">
                            {people.length > 0 && (
                                <div className="mobileSection">
                                    <div className="mobileSectionHeader">
                                        <h4>Who to follow</h4>
                                    </div>
                                    <div className="mobileScrollWrapper">
                                        <button className="scrollArrow left" onClick={() => handleScrollClick(peopleScrollRef, "left")} aria-label="Scroll left">
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <div className="mobileScrollContainer" ref={peopleScrollRef}>
                                            {people.map((person) => (
                                                <div key={person.user_id} className="mobileCard">
                                                    <div 
                                                        className="mobileAvatar" 
                                                        onClick={() => navigate(`/user/profile/${person.user_id}`)}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        {person.profile_pic ? (
                                                            <img src={person.profile_pic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                                                        ) : (
                                                            person.username.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <span className="mobileName">{person.username}</span>
                                                    <button className="mobileFollowBtn" onClick={() => handlePersonFollow(person)}>
                                                        {person.is_following ? "Unfollow" : "Follow"}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="scrollArrow right" onClick={() => handleScrollClick(peopleScrollRef, "right")} aria-label="Scroll right">
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {communities.length > 0 && (
                                <div className="mobileSection">
                                    <div className="mobileSectionHeader">
                                        <h4>Suggested Communities</h4>
                                    </div>
                                    <div className="mobileScrollWrapper">
                                        <button className="scrollArrow left" onClick={() => handleScrollClick(communityScrollRef, "left")} aria-label="Scroll left">
                                            <span className="material-symbols-outlined">chevron_left</span>
                                        </button>
                                        <div className="mobileScrollContainer" ref={communityScrollRef}>
                                            {communities.map((community) => (
                                                <div key={community.community_id} className="mobileCard">
                                                    <div className="mobileAvatar">
                                                        {community.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="mobileName">{community.name}</span>
                                                    {(community.join_status === null || community.join_status === "Rejected") && (
                                                        <button className="mobileFollowBtn" onClick={() => handleJoinCommunity(community)}>
                                                            Join
                                                        </button>
                                                    )}
                                                    {community.join_status === "Pending" && (
                                                        <button className="mobileFollowBtn pending" onClick={() => handleCancelRequest(community.community_id)}>
                                                            Cancel
                                                        </button>
                                                    )}
                                                    {community.join_status === "Joined" && (
                                                        <button className="mobileFollowBtn joined" disabled>
                                                            Joined
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button className="scrollArrow right" onClick={() => handleScrollClick(communityScrollRef, "right")} aria-label="Scroll right">
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* show the posts, or an empty message if there are none */}
                    {posts.length === 0 ? (
                        <div className="emptyFeed">
                            <span className="material-symbols-outlined">inbox</span>
                            <p>{searchActive ? "No posts found." : EMPTY_MESSAGES[activeTab]}</p>
                        </div>
                    ) : (
                        <div className="postList">
                            {posts.map((post, index) => {
                                // Show one ad after every 5 posts.
                                // If there are fewer ads than needed, just repeat the ads from the start of the list.
                                const showAd = (index + 1) % 5 === 0 && ads.length > 0;
                                const ad = showAd ? ads[Math.floor(index / 5) % ads.length] : null;

                                return (
                                    <Fragment key={post.post_id}>
                                        {/* ----- Normal post card ----- */}
                                        <div className="postCard">
                                            <div className="postHeader">
                                                {post.profile_pic ? (
                                                    <img
                                                        className="postAvatar"
                                                        src={post.profile_pic}
                                                        alt={post.username}
                                                        onClick={() => navigate(`/user/profile/${post.user_id}`)}
                                                        style={{ cursor: "pointer", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="postAvatarFallback"
                                                        onClick={() => navigate(`/user/profile/${post.user_id}`)}
                                                    >
                                                        {post.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="postUserInfo">
                                                    <span
                                                        className="postUsername"
                                                        onClick={() => navigate(`/user/profile/${post.user_id}`)}
                                                    >
                                                        {post.username}
                                                    </span>
                                                    <span className="postTime">{post.timestamp}</span>
                                                </div>
                                                {post.community_name && (
                                                    <span className="postCommunityTag">{post.community_name}</span>
                                                )}
                                            </div>

                                            <PostCarousel mediaUrls={post.media_urls} />

                                            <h3 className="postTitle">{post.title}</h3>
                                            <p className={`postDescription ${expandedPosts[post.post_id] ? "" : "clamped"}`}>
                                                {post.description}
                                            </p>
                                            {isLongDescription(post.description) && (
                                                <button
                                                    className="moreBtn"
                                                    onClick={() => toggleExpand(post.post_id)}
                                                >
                                                    {expandedPosts[post.post_id] ? "Show less" : "...more"}
                                                </button>
                                            )}

                                            {/* Hashtags (only show if the post has any) */}
                                            {post.hashtags && post.hashtags.length > 0 && (
                                                <div className="postHashtags">
                                                    {post.hashtags.map((tag) => (
                                                        <span key={tag} className="postHashtag">#{tag}</span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="postFooter">
                                                <span
                                                    className="footerItem"
                                                    onClick={() => handleLike(post.post_id)}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{
                                                            fontVariationSettings: post.is_liked ? "'FILL' 1" : "'FILL' 0",
                                                            color: post.is_liked ? "#e0245e" : "#64748b"
                                                        }}
                                                    >
                                                        favorite
                                                    </span>
                                                    {post.num_of_like}
                                                </span>
                                                <span
                                                    className="footerItem"
                                                    onClick={() => setOpenPostId(post.post_id)}
                                                >
                                                    <span className="material-symbols-outlined">chat_bubble</span>
                                                    {post.num_of_comment}
                                                </span>
                                                <span
                                                    className="footerItem"
                                                    onClick={() => handleShare(post.post_id)}
                                                >
                                                    <span className="material-symbols-outlined">share</span>
                                                </span>
                                                <span
                                                    className="footerItem bookmark"
                                                    onClick={() => handleFavorite(post.post_id)}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{
                                                            fontVariationSettings: post.is_favorited ? "'FILL' 1" : "'FILL' 0",
                                                            color: post.is_favorited ? "#6565fd" : "#64748b"
                                                        }}
                                                    >
                                                        bookmark
                                                    </span>
                                                </span>
                                                <span
                                                    className="footerItem"
                                                    onClick={() => setPostToReport(post)}
                                                >
                                                    <span className="material-symbols-outlined">flag</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* ----- Ad card, mcm like IG ----- */}
                                        {showAd && (
                                            <div className="postCard">
                                                <div className="postHeader">
                                                    <img className="postAvatar" src={ad.ads_profile_pic} alt="ad" />
                                                    <div className="postUserInfo">
                                                        <span className="postUsername">{ad.title}</span>
                                                        <span className="adLabel">Ad</span>
                                                    </div>
                                                </div>

                                                {ad.media_urls && ad.media_urls.length > 0 && (
                                                    <PostCarousel mediaUrls={ad.media_urls} />
                                                )}

                                                <p className="postDescription">{ad.description}</p>

                                                <div className="postFooter">
                                                    <span className="footerItem" onClick={() => handleLike(ad.advertisement_id)}>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{
                                                                fontVariationSettings: ad.is_liked ? "'FILL' 1" : "'FILL' 0",
                                                                color: ad.is_liked ? "#e0245e" : "#64748b"
                                                            }}
                                                        >
                                                            favorite
                                                        </span>
                                                        {ad.num_of_like}
                                                    </span>
                                                    <span className="footerItem" onClick={() => setOpenPostId(ad.advertisement_id)}>
                                                        <span className="material-symbols-outlined">chat_bubble</span>
                                                        {ad.num_of_comment}
                                                    </span>
                                                    <span className="footerItem" onClick={() => handleShare(ad.advertisement_id)}>
                                                        <span className="material-symbols-outlined">share</span>
                                                    </span>
                                                    <span className="footerItem bookmark" onClick={() => handleFavorite(ad.advertisement_id)}>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{
                                                                fontVariationSettings: ad.is_favorited ? "'FILL' 1" : "'FILL' 0",
                                                                color: ad.is_favorited ? "#6565fd" : "#64748b"
                                                            }}
                                                        >
                                                            bookmark
                                                        </span>
                                                    </span>
                                                    <span className="footerItem" onClick={() => setPostToReport({ ...ad, post_id: ad.advertisement_id })}>
                                                        <span className="material-symbols-outlined">flag</span>
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right column: people + community */}
                <aside className="rightSidebar">
                    <section className="rightBox">
                        <h3>People</h3>

                        {/* Search users by username */}
                        <form className="peopleSearch" onSubmit={handlePeopleSearch}>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={peopleSearch}
                                onChange={(e) => setPeopleSearch(e.target.value)}
                            />
                            <button type="submit">Search</button>
                        </form>

                        {/* Click a person to open their profile page. */}
                        {(peopleSearched ? peopleResults : people).length === 0 ? (
                            <p className="emptyBox">{peopleSearched ? "No users found." : "No people to show yet."}</p>
                        ) : (
                            (peopleSearched ? peopleResults : people).map((person) => (
                                <div key={person.user_id} className="rightRow">
                                    {person.profile_pic ? (
                                        <img
                                            className="rightAvatar"
                                            src={person.profile_pic}
                                            alt={person.username}
                                            onClick={() => navigate(`/user/profile/${person.user_id}`)}
                                            style={{ cursor: "pointer", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <div
                                            className="rightAvatar"
                                            onClick={() => navigate(`/user/profile/${person.user_id}`)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            {person.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span
                                        className="rightName"
                                        onClick={() => navigate(`/user/profile/${person.user_id}`)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {person.username}
                                    </span>
                                    <button
                                        className="followBtn"
                                        onClick={() => handlePersonFollow(person)}
                                    >
                                        {person.is_following ? "Unfollow" : "Follow"}
                                    </button>
                                </div>
                            ))
                        )}
                    </section>

                    <section className="rightBox">
                        <h3>Community</h3>

                        {communities.length === 0 ? (
                            <p className="emptyBox">No communities to show yet.</p>
                        ) : (
                            communities.map((community) => (
                                <div key={community.community_id} className="rightRow">
                                    <div className="rightAvatar">
                                        {community.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="rightName">{community.name}</span>

                                    {(community.join_status === null || community.join_status === "Rejected") && (
                                        <button
                                            className="joinBtn"
                                            type="button"
                                            onClick={() => handleJoinCommunity(community)}
                                        >
                                            Join
                                        </button>
                                    )}

                                    {community.join_status === "Pending" && (
                                        <button
                                            className="joinBtn"
                                            type="button"
                                            onClick={() => handleCancelRequest(community.community_id)}
                                        >
                                            Cancel Request
                                        </button>
                                    )}

                                    {community.join_status === "Joined" && (
                                        <button
                                            className="joinBtn"
                                            type="button"
                                            disabled
                                        >
                                            Joined
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </section>
                </aside>

            </div>

            {/* Instagram style comment popup. */}
            {openPostId && (
                <PostModal
                    postId={openPostId}
                    onClose={() => {
                        setOpenPostId(null);
                        loadPosts(activeTab, true);
                        loadAds();
                    }}
                />
            )}

            {/* Report-a-post popup */}
            {postToReport && (
                <ReportModal
                    post={postToReport}
                    onClose={() => setPostToReport(null)}
                />
            )}
        </>
    );
}

export default UserHomepage;
