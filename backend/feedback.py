from flask import Blueprint, request, session
from extensions import query_db, execute_db

feedback_bp = Blueprint("feedback", __name__)


# view ONLY the logged-in user's own feedback 
@feedback_bp.route("/feedback", methods=["GET"])
def get_my_feedback():
    # Must be logged in 
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # user only can see their own feedback, not other people's feedback.
    feedback = query_db(
        """
        SELECT f.feedback_id, f.user_id, u.username,
                f.title, f.description, f.timestamp, f.status
        FROM feedback f
        JOIN `user` u ON f.user_id = u.user_id
        WHERE f.user_id = %s
        ORDER BY f.timestamp DESC
        """,
        (user_id,)
    )

    if feedback == "error":
        return {"error": "Could not load feedback"}, 500

    if not feedback:
        return {
            "data": [],
            "message": "You have not submitted any feedback yet. Give us your feedback so we can improve our system!"
        }

    # The database returns 'timestamp' as a datetime object.
    # for the frontend to display it, need to convert it to a string.
    for fb in feedback:
        fb["timestamp"] = fb["timestamp"].strftime("%Y-%m-%d %H:%M:%S")

    return {"data": feedback}


# submit a new feedback
@feedback_bp.route("/feedback", methods=["POST"])
def submit_feedback():

    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Read the data sent from the frontend.
    # "or {}" avoids a crash if no JSON body was sent.
    data = request.get_json(silent=True) or {} # give me the data the user sent. user sent -> data will be dictionary 
    title = (data.get("title") or "").strip() # .strip() removes whitespace from the start and end of the string.o
    description = (data.get("description") or "").strip()

    # Both fields must be filled in.
    if not title or not description:
        return {"error": "Title and description are required"}, 400

    if len(title) > 50:
        return {"error": "Title must be 50 characters or less"}, 400

    # Save the feedback into the database.
    # 'timestamp' fills in automatically; new feedback starts as 'Unread'.
    new_id = execute_db(
        """
        INSERT INTO feedback (user_id, title, description, status)
        VALUES (%s, %s, %s, 'Unread')
        """,
        (user_id, title, description)
    )

    # execute_db returns the text "error" if the insert failed.
    if new_id == "error":
        return {"error": "Could not save feedback"}, 500

    return {"message": "Feedback submitted successfully", "feedback_id": new_id}
