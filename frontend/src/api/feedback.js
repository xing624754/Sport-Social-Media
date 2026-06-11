// GET - load only the logged-in user's own feedback
export const getFeedback = async () => {
    return await fetch("/api/feedback", {
        credentials: "include"
    });
};

// POST - send one new feedback to the backend
export const submitFeedback = async (title, description) => {
    return await fetch("/api/feedback", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            title,
            description
        })
    });
};


// ----- Admin only -----

// GET - admin loads EVERY user's feedback
export const getAllFeedback = async () => {
    return await fetch("/api/admin/feedback", {
        credentials: "include"
    });
};

// PUT - admin marks one feedback as Read
export const markFeedbackRead = async (feedbackId) => {
    return await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "PUT",
        credentials: "include"
    });
};
