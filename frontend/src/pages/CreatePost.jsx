import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "./UserLayout";
import "../styles/CreatePost.css";

export default function CreatePost({ currentUser }) {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [publicity, setPublicity] = useState("Public");
    const [hashtagInput, setHashtagInput] = useState("");
    const [hashtags, setHashtags] = useState([]);
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaUrls, setMediaUrls] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]); // Store local files
    const [communities, setCommunities] = useState([]);
    const [selectedCommunities, setSelectedCommunities] = useState([]);
    const [suggestedHashtags, setSuggestedHashtags] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMedia, setModalMedia] = useState(null);

    // Protect route: redirect to login if not a User
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'User') {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    // Fetch communities the user belongs to
    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const response = await fetch("/user-post");
                const data = await response.json();
                if (response.ok) {
                    setCommunities(data.communities || []);
                }
            } catch (error) {
                console.error("Error fetching communities:", error);
            }
        };
        fetchCommunities();
    }, []);

    // Fetch hashtag suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            const query = hashtagInput.trim().replace(/^#/, "");
            try {
                const response = await fetch(`/hashtags?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                if (response.ok) {
                    // Filter out tags already added
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

    const toggleCommunity = (id) => {
        if (selectedCommunities.includes(id)) {
            setSelectedCommunities(selectedCommunities.filter(c => c !== id));
        } else {
            setSelectedCommunities([...selectedCommunities, id]);
        }
    };

    const handleAddMedia = () => {
        if (mediaUrl.trim() && !mediaUrls.includes(mediaUrl.trim())) {
            setMediaUrls([...mediaUrls, mediaUrl.trim()]);
            setMediaUrl("");
        }
    };

    const removeMedia = (url) => {
        setMediaUrls(mediaUrls.filter(u => u !== url));
    };

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);

        if (mediaFiles.length + selectedFiles.length > 9) {
            alert("You can only upload a maximum of 9 media items.");
            return;
        }

        const validFiles = [];

        for (const file of selectedFiles) {
            if (file.type.startsWith('video/')) {
                // Check video duration
                const video = document.createElement('video');
                video.preload = 'metadata';

                const duration = await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        window.URL.revokeObjectURL(video.src);
                        resolve(video.duration);
                    };
                    video.onerror = () => resolve(0);
                    video.src = URL.createObjectURL(file);
                });

                if (duration > 180) {
                    alert(`Video "${file.name}" is too long. Maximum duration is 3 minutes.`);
                    continue;
                }

                validFiles.push({
                    file,
                    type: 'video',
                    preview: URL.createObjectURL(file)
                });
            } else {
                validFiles.push({
                    file,
                    type: 'image',
                    preview: URL.createObjectURL(file)
                });
            }
        }

        if (validFiles.length > 0) {
            setMediaFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index) => {
        const newFiles = [...mediaFiles];
        // Revoke the object URL to avoid memory leaks
        URL.revokeObjectURL(newFiles[index].preview);
        newFiles.splice(index, 1);
        setMediaFiles(newFiles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (publicity === "Community" && selectedCommunities.length === 0) {
            alert("Please select at least one community.");
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();

        const postData = {
            title,
            description,
            publicity,
            hashtags,
            media_urls: mediaUrls, // External URLs if any
            community_ids: publicity === "Community" ? selectedCommunities : []
        };

        // Append JSON data as a string
        formData.append("user_new_post", JSON.stringify(postData));

        // Append local files
        mediaFiles.forEach(item => {
            formData.append("media", item.file);
        });

        try {
            const response = await fetch("/user-post", {
                method: "POST",
                body: formData // Fetch automatically sets the correct boundary for FormData
            });

            const data = await response.json();

            if (response.ok) {
                alert("Post created successfully!");
                navigate("/user/home", { state: { justCreatedPost: true } });
            } else {
                alert(data.error || "Failed to create post");
            }
        } catch (error) {
            console.error("Error creating post:", error);
            alert("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="createPostContainer">
                <div className="createPostCard">
                    <div className="headerSection">
                        <h1 className="headerTitle">Create New Post</h1>
                        <p className="headerDesc">Share your sports journey with the community.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                placeholder="Press Enter to add tags (e.g. basketball, training)"
                                value={hashtagInput}
                                onChange={(e) => {
                                    setHashtagInput(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                maxLength={30}
                                onFocus={() => {
                                    setShowSuggestions(true);
                                    const query = hashtagInput.trim().replace(/^#/, "");
                                    fetch(`/api/hashtags?q=${encodeURIComponent(query)}`)
                                        .then(res => res.json())
                                        .then(data => {
                                            const filtered = (data.hashtags || []).filter(h => !hashtags.includes(h));
                                            setSuggestedHashtags(filtered);
                                        });
                                }}
                                onBlur={() => {
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
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
                        <label className="formLabel">Media (Max 9)</label>
                        <div className="mediaUploadSection">
                            <label className="fileUploadBtn">
                                <span className="material-symbols-outlined">perm_media</span>
                                <span>Select Photos or Videos</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    hidden
                                />
                            </label>

                            {mediaFiles.length > 0 && (
                                <div className="mediaPreviewGrid">
                                    {mediaFiles.map((item, index) => (
                                        <div key={index} className="mediaPreviewItem">
                                            {item.type === 'video' ? (
                                                <div className="videoPreviewWrapper" onClick={() => setModalMedia({ url: item.preview, type: 'video' })}>
                                                    <video src={item.preview} className="previewMedia" />
                                                    <div className="playButtonOverlay">
                                                        <span className="material-symbols-outlined">play_circle</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img
                                                    src={item.preview}
                                                    alt={`Preview ${index}`}
                                                    className="previewMedia"
                                                    onClick={() => setModalMedia({ url: item.preview, type: 'image' })}
                                                />
                                            )}
                                            <button
                                                type="button"
                                                className="removeMediaBtn"
                                                onClick={() => removeFile(index)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="formGroup">
                        <label className="formLabel">Visibility</label>
                        <select
                            className="selectField"
                            value={publicity}
                            onChange={(e) => setPublicity(e.target.value)}
                        >
                            <option value="Public">🌍 Public</option>
                            <option value="Community">👥 Community</option>
                        </select>
                    </div>

                    {publicity === "Community" && (
                        <div className="formGroup">
                            <label className="formLabel">Select Communities</label>
                            <div className="communitiesSelectionList">
                                {communities.length > 0 ? (
                                    communities.map(community => (
                                        <button
                                            key={community.community_id}
                                            type="button"
                                            className={`communityBadge ${selectedCommunities.includes(community.community_id) ? 'selected' : ''}`}
                                            onClick={() => toggleCommunity(community.community_id)}
                                        >
                                            {community.name}
                                        </button>
                                    ))
                                ) : (
                                    <p className="noCommunitiesMsg">You aren't a member of any communities yet.</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="submitSection">
                        <button
                            type="submit"
                            className="submitBtn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Post Now"}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {
        modalMedia && (
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
        )
    }
        </>
    );
}
