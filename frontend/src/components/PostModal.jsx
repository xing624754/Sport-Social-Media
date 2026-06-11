import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import {
    getPost,
    toggleLike,
    toggleFavorite,
    getComments,
    addComment
} from "../api/posts";
import PostCarousel from "./PostCarousel";
import "../styles/PostModal.css";

function PostModal({ postId, onClose }) {
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPost();
        loadComments();
    }, [postId]);

    // load post details
    async function loadPost() {
        try {
            const response = await getPost(postId);
            const data = await response.json();
            setPost(response.ok ? data.data : null);
        } catch {
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
        } catch {
            setComments([]);
        }
    }

    // comment 
    async function handleAddComment(e) {
        e.preventDefault();
        const text = newComment.trim();
        if (!text) return;
        try {
            const response = await addComment(postId, text);
            if (response.ok) {
                setNewComment("");
                await loadComments();
                setPost({ ...post, num_of_comment: post.num_of_comment + 1 });
            }
        } catch {}
    }

    // like 
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
        } catch {}
    }
    
    // fav 
    async function handleFavorite() {
        try {
            const response = await toggleFavorite(postId);
            const data = await response.json();
            if (response.ok) {
                setPost({ ...post, is_favorited: data.favorited });
            }
        } catch {}
    }

    useEffect(() => {
        if (postId) {
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [postId]);

    return createPortal(
        // Click the dark background to close.
        <div className="modalOverlay" onClick={onClose}>
            {/* stopPropagation = clicking inside the box does NOT close it */}
            <div className="modalBox" onClick={(e) => e.stopPropagation()}>
                <button className="modalClose" onClick={onClose}>&times;</button>

                {loading ? (
                    <div className="modalLoading">Loading...</div>
                ) : !post ? (
                    <div className="modalLoading">Post not found.</div>
                ) : (
                    <>
                        {/* post image on left side*/}
                        <div className="modalLeft">
                            <PostCarousel mediaUrls={post.media_urls} />
                        </div>

                        {/* post details on right side*/}
                        <div className="modalRight">
                            <div className="modalHeader">
                                <div className="modalAvatar">{post.username.charAt(0).toUpperCase()}</div>
                                <span className="modalUsername">{post.username}</span>
                            </div>

                            <div className="modalComments">
                                {/* the post text shows as the first item, like IG's caption */}
                                <div className="commentItem">
                                    <div className="commentAvatar">{post.username.charAt(0).toUpperCase()}</div>
                                    <div className="commentBody">
                                        <span className="commentUsername">{post.username}</span>
                                        <p className="commentText"><strong>{post.title}</strong> {post.description}</p>
                                    </div>
                                </div>

                                {comments.length === 0 ? (
                                    <p className="emptyComments">No comments yet. Be the first!</p>
                                ) : (
                                    comments.map((c) => (
                                        <div key={c.post_comment_id} className="commentItem">
                                            <div className="commentAvatar">{c.username.charAt(0).toUpperCase()}</div>
                                            <div className="commentBody">
                                                <span className="commentUsername">{c.username}</span>
                                                <p className="commentText">{c.comment}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="modalActions">
                                <span className="footerItem" onClick={handleLike}>
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: post.is_liked ? "'FILL' 1" : "'FILL' 0", color: post.is_liked ? "#e0245e" : "#64748b" }}>favorite</span>
                                    {post.num_of_like}
                                </span>
                                <span className="footerItem">
                                    <span className="material-symbols-outlined">chat_bubble</span>
                                    {post.num_of_comment}
                                </span>
                                <span className="footerItem bookmark" onClick={handleFavorite}>
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: post.is_favorited ? "'FILL' 1" : "'FILL' 0", color: post.is_favorited ? "#6565fd" : "#64748b" }}>bookmark</span>
                                </span>
                            </div>

                            <form className="modalForm" onSubmit={handleAddComment}>
                                <input type="text" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="modalInput" />
                                <button type="submit" className="modalSubmit">Post</button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>,

        document.body
    );
}

export default PostModal;
