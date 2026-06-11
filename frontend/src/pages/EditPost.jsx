import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/CreatePost.css";

export default function EditPost({ currentUser }) {
    const { postId } = useParams();
    const navigate = useNavigate();
    
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publicity, setPublicity] = useState("Public");
    const [hashtagInput, setHashtagInput] = useState("");
    const [hashtags, setHashtags] = useState([]);
    const [mediaUrls, setMediaUrls] = useState([]);
    const [suggestedHashtags, setSuggestedHashtags] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [modalMedia, setModalMedia] = useState(null);

    // Protect route: redirect to login if not a User
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'User') {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    // Fetch post data on mount
    useEffect(() => {
        const fetchPostData = async () => {
            try {
                const response = await fetch(`/edit-user-post/${postId}`);
                const data = await response.json();
                if (response.ok) {
                    setTitle(data.post.title);
                    setDescription(data.post.description);
                    setPublicity(data.post.publicity);
                    setHashtags(data.post.hashtags || []);
                    setMediaUrls(data.post.media_urls || []);
                } else {
                    alert(data.error || "Failed to fetch post data");
                    navigate("/user/home");
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                alert("Network error. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchPostData();
    }, [postId, navigate]);

    // Fetch hashtag suggestions (similar to CreatePost)
    useEffect(() => {
        if (!hashtagInput.trim()) {
            setSuggestedHashtags([]);
            return;
        }

        const fetchSuggestions = async () => {
            const query = hashtagInput.trim().replace(/^#/, "");
            try {
                const response = await fetch(`/hashtags?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                if (response.ok) {
                    const filtered = (data.hashtags || []).filter(h => !hashtags.includes(h));
                    setSuggestedHashtags(filtered);
                }
            } catch (error) {
                console.error("Error fetching hashtag suggestions:", error);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchSuggestions();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [hashtagInput, hashtags]);

    const addHashtag = (tag) => {
        const cleaned = tag.trim().replace(/^#/, "");
        if (cleaned && !hashtags.includes(cleaned)) {
            setHashtags([...hashtags, cleaned]);
        }
        setHashtagInput("");
        setSuggestedHashtags([]);
    };

    const handleAddHashtag = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addHashtag(hashtagInput);
        }
    };

    const removeHashtag = (tag) => {
        setHashtags(hashtags.filter(t => t !== tag));
    };

    const removeMedia = (url) => {
        setMediaUrls(mediaUrls.filter(u => u !== url));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const updateData = {
            title,
            description,
            hashtags,
            media_urls: mediaUrls // URLs to KEEP
        };

        try {
            const response = await fetch(`/edit-user-post/${postId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok) {
                alert("Post updated successfully!");
                navigate("/user/home");
            } else {
                alert(data.error || "Failed to update post");
            }
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
            return;
        }

        setIsDeleting(true);

        try {
            const response = await fetch(`/delete-user-post/${postId}`, {
                method: "DELETE"
            });

            const data = await response.json();

            if (response.ok) {
                alert("Post deleted successfully!");
                navigate("/user/home");
            } else {
                alert(data.error || "Failed to delete post");
            }
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Network error. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="createPostContainer">
                <p>Loading post data...</p>
            </div>
        );
    }

    return (
        <>
            <div className="createPostContainer">
                <div className="createPostCard">
                    <div className="headerSection">
                        <h1 className="headerTitle">Edit Post</h1>
                        <p className="headerDesc">Update your sports journey or remove this post.</p>
                    </div>

                    <form onSubmit={handleUpdate}>
                        <div className="formGroup">
                            <label className="formLabel">Title</label>
                            <input
                                type="text"
                                className="inputField"
                                placeholder="What's on your mind?"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                required
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Description</label>
                            <textarea
                                className="textareaField"
                                placeholder="Tell us more..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={5000}
                                required
                            />
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Hashtags</label>
                            <div className="hashtagInputWrapper">
                                <input
                                    type="text"
                                    className="inputField"
                                    placeholder="Press Enter to add tags"
                                    value={hashtagInput}
                                    onChange={(e) => {
                                        setHashtagInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    maxLength={30}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    onKeyDown={handleAddHashtag}
                                />
                                {showSuggestions && suggestedHashtags.length > 0 && (
                                    <div className="suggestionsList">
                                        {suggestedHashtags.map(tag => (
                                            <div 
                                                key={tag} 
                                                className="suggestionItem"
                                                onClick={() => addHashtag(tag)}
                                            >
                                                #{tag}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="hashtagsWrapper">
                                {hashtags.map(tag => (
                                    <span key={tag} className="hashtagItem">
                                        #{tag}
                                        <span className="removeTag" onClick={() => removeHashtag(tag)}>×</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Current Media</label>
                            {mediaUrls.length > 0 ? (
                                <div className="mediaPreviewGrid">
                                    {mediaUrls.map((url, index) => (
                                        <div key={index} className="mediaPreviewItem">
                                            {url.toLowerCase().match(/\.(mp4|webm|ogg)$/) || url.includes('video') ? (
                                                <div className="videoPreviewWrapper" onClick={() => setModalMedia({ url, type: 'video' })}>
                                                    <video src={url} className="previewMedia" />
                                                    <div className="playButtonOverlay">
                                                        <span className="material-symbols-outlined">play_circle</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={url} 
                                                    alt={`Post media ${index}`} 
                                                    className="previewMedia" 
                                                    onClick={() => setModalMedia({ url, type: 'image' })}
                                                />
                                            )}
                                            <button 
                                                type="button" 
                                                className="removeMediaBtn"
                                                onClick={() => removeMedia(url)}
                                                title="Remove media"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="noCommunitiesMsg">No media in this post.</p>
                            )}
                            <p className="headerDesc" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                                Note: Adding new media during edit is currently not supported.
                            </p>
                        </div>

                        <div className="formGroup">
                            <label className="formLabel">Visibility</label>
                            <input 
                                type="text" 
                                className="inputField" 
                                value={publicity} 
                                disabled 
                                style={{background: '#f1f5f9', cursor: 'not-allowed'}}
                            />
                            <p className="headerDesc" style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>
                                Visibility cannot be changed after posting.
                            </p>
                        </div>

                        <div className="submitSection">
                            <button 
                                type="button" 
                                className="editPostDeleteBtn"
                                onClick={handleDelete}
                                disabled={isDeleting || isSubmitting}
                            >
                                {isDeleting ? "Deleting..." : "Delete Post"}
                            </button>
                            <button 
                                type="submit" 
                                className="editPostSubmitBtn"
                                disabled={isSubmitting || isDeleting}
                            >
                                {isSubmitting ? "Updating..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {modalMedia && (
                <div className="mediaModalOverlay" onClick={() => setModalMedia(null)}>
                    <div className="mediaModalContent" onClick={(e) => e.stopPropagation()}>
                        <button className="closeModalBtn" onClick={() => setModalMedia(null)}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        {modalMedia.type === 'video' ? (
                            <video src={modalMedia.url} controls autoPlay className="fullMedia" />
                        ) : (
                            <img src={modalMedia.url} alt="Full preview" className="fullMedia" />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
