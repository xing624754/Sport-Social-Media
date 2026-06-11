import { useState, useEffect } from "react";
import { getAllFeedback, markFeedbackRead } from "../api/feedback";
import { toast } from "react-toastify";
import "../styles/AdminCommon.css";
import "../styles/AdminFeedback.css";

function AdminFeedback() {
    // The list of feedback from all users.
    const [feedbackList, setFeedbackList] = useState([]);

    // Load all feedback when the page first opens.
    useEffect(() => {
        loadFeedback();
    }, []);

    // Ask the backend for every user's feedback.
    async function loadFeedback() {
        try {
            const response = await getAllFeedback();
            const data = await response.json();
            setFeedbackList(data.data || []);
        } catch (err) {
            setFeedbackList([]);
        }
    }

    // mark as read
    async function handleMarkRead(feedbackId) {
        try {
            const response = await markFeedbackRead(feedbackId);
            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                loadFeedback();   // refresh so the badge updates
            } else {
                toast.error(data.error);
            }
        } catch (err) {
            toast.error("Network error");
        }
    }

    return (
            <div className="adminFeedbackPage">
                <h2>User Feedback</h2>

                {feedbackList.length === 0 ? (
                    <p className="emptyText">No feedback yet.</p>
                ) : (
                    <ul className="adminFeedbackList">
                        {feedbackList.map((fb) => (
                            <li key={fb.feedback_id} className="adminFeedbackItem">
                                {/* Top row: who sent it + when + Read/Unread badge */}
                                <div className="adminFeedbackTop">
                                    <div className="adminFeedbackAvatar">
                                        {fb.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="adminFeedbackUserInfo">
                                        <span className="adminFeedbackUser">{fb.username}</span>
                                        <span className="adminFeedbackDate">{fb.timestamp}</span>
                                    </div>
                                    <span className={"statusBadge " + (fb.status === "Read" ? "read" : "unread")}>
                                        {fb.status}
                                    </span>
                                </div>

                                {/* The feedback itself */}
                                <strong>{fb.title}</strong>
                                <p>{fb.description}</p>

                                {/* Only Unread feedback shows the button */}
                                {fb.status === "Unread" && (
                                    <button
                                        className="markReadBtn"
                                        onClick={() => handleMarkRead(fb.feedback_id)}
                                    >
                                        <span className="material-symbols-outlined">check_circle</span>
                                        Mark as read
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
    );
}

export default AdminFeedback;
