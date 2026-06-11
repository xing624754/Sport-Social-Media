from flask import Blueprint, session, jsonify, request
from extensions import query_db, execute_db

user_notification_bp = Blueprint("user_notification_bp", __name__)

@user_notification_bp.route("/user/notification-count", methods=["GET"])
def get_notification_count():
    user_id = session.get("user_id")
    unread = query_db("""
        SELECT COUNT(*) AS total
        FROM notification
        WHERE user_id = %s
        AND status = 'unread'
    """, (user_id,), one=True)

    return jsonify({
        "unreadNotificationCount": unread["total"] if unread else 0
    })

@user_notification_bp.route("/user/notifications", methods=["GET"])
def get_notifications():
    user_id = session.get("user_id")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    offset = (page - 1) * limit

    # 1. Standard Personal Notifications (Pulling notification_content)
    notifications = query_db("""
        SELECT
            notification_id AS id,
            notification_content AS content,
            status,
            timestamp,
            'notification' AS type
        FROM notification
        WHERE user_id = %s AND (type IS NULL OR type != 'Announcement')
        ORDER BY timestamp DESC
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset)) or []

    # 2. Global Announcements (Joining table to grab real Title & Content description)
    announcements = query_db("""
        SELECT
            n.notification_id AS id,
            a.announcement_id AS announcement_actual_id,
            a.title AS title,
            a.content AS content,
            a.file_url,
            n.status,
            n.timestamp,
            'announcement' AS type
        FROM notification n
        INNER JOIN announcement a ON n.announcement_id = a.announcement_id
        WHERE n.user_id = %s 
          AND n.type = 'Announcement'
          AND a.is_deleted = 0
        ORDER BY n.timestamp DESC
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset)) or []

    return jsonify({
        "notifications": notifications,
        "announcements": announcements,
        "page": page,
        "limit": limit
    })

@user_notification_bp.route("/user/notifications/read", methods=["PUT"])
def mark_notifications_read():
    user_id = session.get("user_id")
    data = request.get_json() or {}
    notif_id = data.get("id")
    mark_all = data.get("all", False)

    if mark_all or not notif_id:
        execute_db("""
            UPDATE notification
            SET status = 'read'
            WHERE user_id = %s
        """, (user_id,))
        return jsonify({"message": "All notifications marked as read"})

    # Clean stripping of custom frontend string IDs if present
    clean_id = str(notif_id).replace("n-", "").replace("a-", "")

    execute_db("""
        UPDATE notification
        SET status = 'read'
        WHERE notification_id = %s AND user_id = %s
    """, (clean_id, user_id))

    return jsonify({"message": "Updated"})