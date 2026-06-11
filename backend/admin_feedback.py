from flask import Blueprint, session
from extensions import query_db, execute_db

admin_feedback_bp = Blueprint("admin_feedback", __name__)


# Returns an error response if the person is not an admin,
# or None if they are allowed to continue.
def require_admin():
    if not session.get("user_id"):
        return {"error": "You must login"}, 401
    if session.get("role") not in ("Admin", "Superadmin"):
        return {"error": "Only admins can view feedback"}, 403
    return None


# GET - admin sees EVERY user's feedback (newest first).
@admin_feedback_bp.route("/admin/feedback", methods=["GET"])
def get_all_feedback():
    error = require_admin()
    if error:
        return error

    feedback = query_db(
        """
        SELECT f.feedback_id, f.user_id, u.username,
               f.title, f.description, f.timestamp, f.status
        FROM feedback f
        JOIN `user` u ON f.user_id = u.user_id
        ORDER BY f.timestamp DESC
        """,
        ()
    )
    if feedback == "error":
        return {"error": "Could not load feedback"}, 500

    # The database returns 'timestamp' as a datetime, so turn it into a string.
    for fb in (feedback or []):
        fb["timestamp"] = fb["timestamp"].strftime("%Y-%m-%d %H:%M:%S")

    return {"data": feedback or []}


# PUT - admin marks one feedback as 'Read'.
@admin_feedback_bp.route("/admin/feedback/<int:feedback_id>", methods=["PUT"])
def mark_feedback_read(feedback_id):
    error = require_admin()
    if error:
        return error

    result = execute_db(
        "UPDATE feedback SET status = 'Read' WHERE feedback_id = %s",
        (feedback_id,)
    )
    if result == "error":
        return {"error": "Could not update feedback"}, 500

    return {"message": "Feedback marked as read"}
