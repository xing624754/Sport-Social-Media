import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, getComments, addComment, toggleLike, toggleFavorite } from "../api/posts";
import PostCarousel from "../components/PostCarousel";
import "../styles/ViewPost.css";
import { Pencil } from "lucide-react"


function ViewPost({ currentUser }) {
    // /post/2 -> postId = "2"
    const { postId } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);             // the post data
    const [comments, setComments] = useState([]);       // list of comments
    const [newComment, setNewComment] = useState("");   // text in the input box
    const [loading, setLoading] = useState(true);

    // When the page first opens, load the post + its comments.
    useEffect(() => {
        loadPost();
        loadComments();
    }, [postId]);

    async function loadPost() {
        try {
            const response = await getPost(postId);
            const data = await response.json();
            if (response.ok) {
                setPost(data.data);
            } else {
                setPost(null);
            }
        } catch (err) {
            setPost(null);
        } finally {
            setLoading(false);
        }
    }

    async function loadComments() {
        try {
            const response = await getComments(postId);
            const data = await response.json();
            setComments(data.data || []);
        } catch (err) {
            setComments([]);
        }
    }

    // Submit the comment from the input box.
    async function handleAddComment(e) {
        e.preventDefault();
        const text = newComment.trim();
        if (!text) return;

        try {
            const response = await addComment(postId, text);
            if (response.ok) {
                setNewComment("");      // clear input
                await loadComments();   // reload list to show the new one
                // Bump the comment count shown on this page.
                setPost({ ...post, num_of_comment: post.num_of_comment + 1 });
            }
        } catch (err) {
            // Ignore - user can try again.
        }
    }

    // Click the heart - toggle like, update the UI right away.
    async function handleLike() {
        try {
            const response = await toggleLike(postId);
            const data = await response.json();
            if (response.ok) {
                setPost({
                    ...post,
                    is_liked: data.liked,
                    num_of_like: post.num_of_like + (data.liked ? 1 : -1)
                });
            }
        } catch (err) {
            // Ignore.
        }
    }

    // Click the bookmark - toggle favorite.
    async function handleFavorite() {
        try {
            const response = await toggleFavorite(postId);
            const data = await response.json();
            if (response.ok) {
                setPost({ ...post, is_favorited: data.favorited });
            }
        } catch (err) {
            // Ignore.
        }
    }

    if (loading) {
        return (
            <div className="viewPostContainer">
                <p>Loading...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="viewPostContainer">
                <button className="backBtn" onClick={() => navigate(-1)}>Back</button>
                <p>Post not found.</p>
            </div>
        );
    }

    return (
        <>
            <div className="viewPostContainer">

                <button className="backBtn" onClick={() => navigate(-1)}>Back</button>

                {/* ----- The post ----- */}
                <div className="viewPostCard">

                    {/* Top row: avatar + username + time */}
                    <div className="viewPostHeader">
                        <div className="viewPostAvatar">
                            {post.profile_pic ? (
                                <img
                                    src={post.profile_pic}
                                    alt={post.username}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%"
                                    }}
                                />
                            ) : (
                                post.username.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="viewPostUserInfo">
                            <span className="viewPostUsername">{post.username}</span>
                            <span className="viewPostTime">{post.timestamp}</span>
                        </div>
                    </div>

                    {/* Image area. Shows real images, or a grey placeholder if none. */}
                    <PostCarousel mediaUrls={post.media_urls} />

                    <h2 className="viewPostTitle">{post.title}</h2>
                    <p className="viewPostDescription">{post.description}</p>

                    {/* Hashtags (only show if the post has any) */}
                    {post.hashtags && post.hashtags.length > 0 && (
                        <div className="viewPostHashtags">
                            {post.hashtags.map((tag) => (
                                <span key={tag} className="viewPostHashtag">#{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* Bottom row: like, comment count, bookmark */}
                    <div className="viewPostFooter">
                        <span
                            className="footerItem"
                            onClick={handleLike}
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
                        <span className="footerItem">
                            <span className="material-symbols-outlined">chat_bubble</span>
                            {post.num_of_comment}
                        </span>

                        {/*Edit icon – only visible to the post owner*/}
                        {currentUser?.userID === post.user_id && (
                            <span
                                className="footerItem"
                                onClick={() =>
                                    navigate(`/user/post/edit/${post.post_id}`)
                                }
                            >
                                <Pencil
                                    size={18}
                                    color="#64748b"
                                />
                            </span>
                        )}
                                            <span
                            className="footerItem bookmark"
                            onClick={handleFavorite}
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
                    </div>
                </div>

                {/* ----- Comments section ----- */}
                <div className="commentsSection">
                    <h3>Comments</h3>

                    {comments.length === 0 ? (
                        <p className="emptyComments">No comments yet. Be the first!</p>
                    ) : (
                        comments.map((c) => (
                            <div key={c.post_comment_id} className="commentItem">
                                <div className="commentAvatar">
                                    {c.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="commentBody">
                                    <span className="commentUsername">{c.username}</span>
                                    <p className="commentText">{c.comment}</p>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Comment input box */}
                    <form className="commentForm" onSubmit={handleAddComment}>
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="commentInput"
                        />
                        <button type="submit" className="commentSubmit">Send</button>
                    </form>
                </div>
            </div>
        </>
    );
}

export default ViewPost;
