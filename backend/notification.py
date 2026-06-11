from flask import Blueprint, session
from extensions import query_db, execute_db

notification_bp = Blueprint("notification", __name__)


# GET - load the logged-in user's notifications (newest first) + unread count
@notification_bp.route("/notifications", methods=["GET"])
def get_notifications():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    notifications = query_db(
        """
        SELECT notification_id, notification_content, timestamp, status
        FROM notification
        WHERE user_id = %s
        ORDER BY timestamp DESC
        """,
        (user_id,)
    )
    if notifications == "error":
        return {"error": "Could not load notifications"}, 500

    # Turn each timestamp into clean text, and count how many are unread.
    unread_count = 0
    for n in notifications:
        n["timestamp"] = n["timestamp"].strftime("%Y-%m-%d %H:%M")
        if n["status"] == "Unread":
            unread_count += 1

    return {"data": notifications, "unread": unread_count}


# PUT - mark ALL of the logged-in user's notifications as read
@notification_bp.route("/notifications/read", methods=["PUT"])
def mark_notifications_read():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    result = execute_db(
        "UPDATE notification SET status = 'Read' WHERE user_id = %s AND status = 'Unread'",
        (user_id,)
    )
    if result == "error":
        return {"error": "Could not update notifications"}, 500

    return {"message": "Notifications marked as read"}
