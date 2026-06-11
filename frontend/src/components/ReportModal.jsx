import { useState } from "react";
import { reportUser, reportPost } from "../api/report";
import { toast } from "react-toastify";
import { createPortal } from "react-dom";
import "../styles/ReportModal.css";

// A small popup for reporting either a USER or a POST.
//   report user and post
function ReportModal({ person, post, onClose }) {
    // If a post is passed in, we're reporting a post; otherwise a user.
    const isPost = Boolean(post);

    // What the user types as the reason.
    const [reason, setReason] = useState("");

    // True while the report is being sent.
    const [submitting, setSubmitting] = useState(false);

    
    async function handleSubmit() {
        // The reason cannot be empty.
        if (!reason.trim()) {
            toast.error("Please give a reason");
            return;
        }

        setSubmitting(true);
        try {
            const response = isPost
                ? await reportPost(post.post_id, reason.trim())
                : await reportUser(person.user_id, reason.trim());
            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || "Report submitted");
                onClose();   // close the popup
            } else {
                toast.error(data.error || "Could not submit report");
            }
        } catch (err) {
            toast.error("Network error");
        }
        setSubmitting(false);
    }

    return createPortal(
        // Clicking the dark background closes the popup.
        <div className="reportOverlay" onClick={onClose}>
            {/* popup content */}
            <div className="reportModal" onClick={(e) => e.stopPropagation()}>
                <h3>{isPost ? "Report this post" : `Report ${person.username}`}</h3>
                <p className="reportHint">
                    {isPost
                        ? "Tell us why you're reporting this post."
                        : "Tell us why you're reporting this user."}
                </p>

                <textarea
                    className="reportTextarea"
                    placeholder="Reason..."
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />

                <div className="reportButtons">
                    <button className="reportCancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="reportSubmit"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Report"}
                    </button>
                </div>
            </div>
        </div>,

        document.body
    );
}

export default ReportModal;
