import { useState, useEffect } from "react";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../api/announcement";
import { toast } from "react-toastify";
import socket from "../api/socket";
import "../styles/AdminCommon.css";
import "../styles/AdminAnn.css";


function AdminAnn() {
    // Form inputs
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [file, setFile] = useState(null);   // optional announcement image

    // The list of announcements shown below the form
    const [announcements, setAnnouncements] = useState([]);

    // Load the list when the page first opens.
    useEffect(() => {
        loadAnnouncements();

        socket.on("announcements_updated", loadAnnouncements);
        return () => {
            socket.off("announcements_updated", loadAnnouncements);
        };
    }, []);

    // Ask the backend for all announcements.
    async function loadAnnouncements() {
        try {
            const response = await getAnnouncements();
            const data = await response.json();
            setAnnouncements(data.data || []);
        } catch (err) {
            setAnnouncements([]);
        }
    }

    // Send button .
    async function handleCreate(e) {
        e.preventDefault();

        // Don't send empty fields.
        if (!title.trim() || !content.trim()) {
            toast.error("Please fill in both the title and content");
            return;
        }

        try {
            const response = await createAnnouncement(title, content, file);
            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                setTitle("");          // clear the form
                setContent("");
                setFile(null);
                loadAnnouncements();   // refresh the list
            } else {
                toast.error(data.error);
            }
        } catch (err) {
            toast.error("Network error");
        }
    }

    // Delete button .
    async function handleDelete(announcementId) {
        try {
            const response = await deleteAnnouncement(announcementId);
            const data = await response.json();

            if (response.ok) {
                toast.success(data.message);
                loadAnnouncements();   // refresh the list
            } else {
                toast.error(data.error);
            }
        } catch (err) {
            toast.error("Network error");
        }
    }

    return (
            <div className="announcementPage">
                <h2>Announcements</h2>

                {/* ----- Create + send form ----- */}
                <form className="announcementForm" onSubmit={handleCreate}>
                    <label>
                        Title
                        <input
                            type="text"
                            placeholder="Announcement title"
                            value={title}
                            maxLength={50}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </label>

                    <label>
                        Content
                        <textarea
                            placeholder="Write your announcement..."
                            value={content}
                            rows={4}
                            maxLength={2000}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <span className="charCount">{content.length}/2000</span>
                    </label>

                    <label className="fileField">
                        Image (optional)
                        <span className="fileUploadBtn">
                            <span className="material-symbols-outlined">image</span>
                            {file ? file.name : "Choose an image"}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) => setFile(e.target.files[0] || null)}
                        />
                    </label>

                    <button type="submit" className="sendBtn">Send</button>
                </form>

                {/* ----- List of sent announcements ----- */}
                <h3>Sent Announcements</h3>

                {announcements.length === 0 ? (
                    <p className="emptyText">No announcements yet.</p>
                ) : (
                    <ul className="announcementList">
                        {announcements.map((a) => (
                            <li key={a.announcement_id} className="announcementItem">
                                {a.file_url && (
                                    <img
                                        src={a.file_url}
                                        alt=""
                                        className="announcementImage"
                                    />
                                )}
                                <div className="announcementText">
                                    <strong>{a.title}</strong>
                                    <p>{a.content}</p>
                                </div>
                                <button
                                    className="deleteBtn"
                                    onClick={() => handleDelete(a.announcement_id)}
                                    title="Delete"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
    );
}

export default AdminAnn;
