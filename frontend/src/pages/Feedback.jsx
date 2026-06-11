import { useState, useEffect } from "react";
import { getFeedback, submitFeedback } from "../api/feedback";
import "../styles/Feedback.css";


function Feedback() {
    // The list of feedback shown on the page.
    const [feedbackList, setFeedbackList] = useState([]);

    // Message shown when the list is empty.
    const [emptyMessage, setEmptyMessage] = useState("");

    // True while we are still loading feedback from the backend.
    const [loading, setLoading] = useState(true);

    // These hold whatever the user types into the form.
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    // An error message to show under the form if submitting fails.
    const [formError, setFormError] = useState("");

    // Load the logged-in user's feedback when the page opens.
    useEffect(() => {
        loadFeedback();
    }, []);

    // Ask the backend (GET) for all feedback.
    async function loadFeedback() {
        setLoading(true);
        try {
            const response = await getFeedback();
            const data = await response.json();

            // data.data is the list.
            // data.message only exists when the list is empty.
            setFeedbackList(data.data || []);
            setEmptyMessage(data.message || "");
        } catch (err) {
            // The backend could not be reached.
            setFeedbackList([]);
            setEmptyMessage("Could not load feedback. Please try again later.");
        }
        setLoading(false);
    }

    // Runs when the user clicks the Submit button.
    async function handleSubmit(event) {
        event.preventDefault();   // stop the browser from refreshing the page
        setFormError("");

        // Do nothing if the title or message is empty.
        if (title.trim() === "" || description.trim() === "") {
            setFormError("Please fill in both the title and the message.");
            return;
        }

        try {
            // Send the new feedback to the backend (POST).
            const response = await submitFeedback(title, description);
            const data = await response.json();

            // show an error message if the backend returned an error 
            // e.g. if the user already has 5 feedback and the backend rejects more.
            if (!response.ok) {
                setFormError(data.error || "Could not submit feedback.");
                return;
            }

            // Success - clear the form and reload the list so the
            // new feedback shows up.
            setTitle("");
            setDescription("");
            loadFeedback();
        } catch (err) {
            setFormError("Could not reach the server. Please try again.");
        }
    }

    return (
            <div className="feedbackContainer">
                <h1>Feedback</h1>

                {/* ----- Form: send new feedback ----- */}
                <form className="feedbackForm" onSubmit={handleSubmit}>
                    <h2>Send us your feedback</h2>

                    {/* Title input */}
                    <label className="formLabel">Title</label>
                    <input
                        className="formInput"
                        type="text"
                        placeholder="Short title for your feedback"
                        maxLength={50}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    {/* Message box */}
                    <label className="formLabel">Message</label>
                    <textarea
                        className="formTextarea"
                        placeholder="Tell us more..."
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    ></textarea>

                    {/* Error message if formError is not empty */}
                    {formError && <p className="formError">{formError}</p>}

                    <button type="submit" className="submitBtn">
                        Submit Feedback
                    </button>
                </form>

                {/* ----- this user's own feedback only ----- */}
                <div className="feedbackHistory">
                    <h2>My Feedback</h2>

                    {/* While the feedback is still loading */}
                    {loading && <p className="emptyText">Loading feedback...</p>}

                    {/* Loaded, but the list is empty  */}
                    {!loading && feedbackList.length === 0 && (
                        <p className="emptyText">
                            {emptyMessage || "No feedback yet."}
                        </p>
                    )}

                    {/* Loaded - show one card for each feedback */}
                    {!loading && feedbackList.map((fb) => (
                        <div key={fb.feedback_id} className="feedbackCard">
                            {/* Top row: avatar + username/date + status badge */}
                            <div className="feedbackCardTop">
                                {/* Avatar = first letter of the username */}
                                <div className="feedbackAvatar">
                                    {fb.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="feedbackUserInfo">
                                    <span className="feedbackUsername">{fb.username}</span>
                                    <span className="feedbackDate">{fb.timestamp}</span>
                                </div>
                                {/* The status decides which colour class to use */}
                                <span
                                    className={
                                        "statusBadge " +
                                        (fb.status === "Read" ? "read" : "unread")
                                    }
                                >
                                    {fb.status}
                                </span>
                            </div>

                            <div className="feedbackView">
                                <h3 className="feedbackTitle">{fb.title}</h3>
                                <p className="feedbackMessage">{fb.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
    );
}

export default Feedback;
