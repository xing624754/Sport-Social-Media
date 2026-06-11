import { useState, useEffect, Fragment } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import { getPosts } from "../api/sportsCommunity";
import { toggleLike, toggleFavorite } from "../api/posts";

import PostModal from "../components/PostModal";
import ReportModal from "../components/ReportModal";
import PostCarousel from "../components/PostCarousel";

export default function CommunityPosts({ communityInfo, userID }) {
    const BASE_URL = "http://localhost:5000/community";

    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [posts, setPosts] = useState([]);

    // Which post's comment popup is open (null = none open).
    const [openPostId, setOpenPostId] = useState(null);

    const navigate = useNavigate();

    // Which posts have their full description expanded (keyed by post_id).
    const [expandedPosts, setExpandedPosts] = useState({});

    // Which post is being reported (null = report popup closed).
    const [postToReport, setPostToReport] = useState(null);

    useEffect(() => {
        setPosts([]);
        setHasMorePosts(true);

        if (communityInfo?.community_id) {
            loadPosts(true);
        }
    }, [communityInfo]);

    const loadPosts = async (isNewCommunity = false) => {
        if (loadingMore || !hasMorePosts) return;

        setLoadingMore(true);

        try{
            const currentNoOfPosts = isNewCommunity ? 0 : posts.length;

            const response = await getPosts(communityInfo?.community_id, currentNoOfPosts, userID)
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            if (data.posts.length < 10){
                setHasMorePosts(false);
            }

            setPosts((prev) => {
                const updatedPosts = isNewCommunity
                    ? data.posts
                    : [...prev, ...data.posts];

                return updatedPosts;
            });

        }
        catch(err){
            toast.error("Network error");
        }
        finally{
            setLoadingMore(false);
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
            }
        } catch (err) {
            // Ignore - user can try again.
        }
    };

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
            }
        } catch (err) {
            // Ignore.
        }
    };

    // Click the share icon - copy the post's link so it can be pasted anywhere.
    async function handleShare(postId) {
        const link = `${window.location.origin}/user/post/${postId}`;
        try {
            await navigator.clipboard.writeText(link);
            toast.success("Link copied!");
        } catch (err) {
            toast.error("Could not copy link");
        }
    };

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

    useEffect(() => {
        const loadMorePosts = () => {
            if (hasMorePosts && !loadingMore) {
                loadPosts();
            }
        };

        window.addEventListener("loadCommunityPosts", loadMorePosts);

        return () => {
            window.removeEventListener("loadCommunityPosts", loadMorePosts);
        };
    }, [hasMorePosts, loadingMore, posts]);
    

    return(
        <div className="posts-container">
            {/* show the posts, or an empty message if there are none */}
            {posts.length === 0 ? (
                <div className="emptyFeed">
                    <span className="material-symbols-outlined">inbox</span>
                    <p>No posts found.</p>
                </div>
            ) : (
                <div className="postList">
                    {posts.map((post, index) => {

                        return (
                            <Fragment key={post.post_id}>
                                {/* ----- Normal post card ----- */}
                                <div className="postCard">
                                    <div className="postHeader">
                                        <div 
                                            className="postAvatarFallback"
                                            onClick={() => navigate(`/user/profile/${post.user_id}`)}
                                        >
                                            {post.username.charAt(0).toUpperCase()}
                                        </div>
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
                            </Fragment>
                        );
                    })}
                </div>
            )}

            {/* Instagram-style comment popup. Reload the feed on close so the counts stay correct. */}
            {openPostId && (
                <PostModal
                    postId={openPostId}
                    onClose={() => {
                        setOpenPostId(null);
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
        </div>
    );
};