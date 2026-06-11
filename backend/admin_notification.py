from flask import Blueprint, session, jsonify, request
from extensions import query_db, execute_db

admin_notification_bp = Blueprint(
    "admin_notification_bp",
    __name__
)

# ==============================
# 1. GET UNREAD ANNOUNCEMENT COUNT
# ==============================
@admin_notification_bp.route(
    "/admin/notification-count",
    methods=["GET"]
)
def get_admin_notification_count():
    user_id = session.get("user_id")

    unread = query_db("""
        SELECT COUNT(*) AS total
        FROM announcement a
        LEFT JOIN notification n 
            ON a.announcement_id = n.announcement_id 
            AND n.user_id = %s 
            AND LOWER(n.type) = 'announcement'
        WHERE a.is_deleted = 0
          AND (n.status IS NULL OR n.status != 'read')
    """, (user_id,), one=True)

    return jsonify({
        "unreadNotificationCount": unread["total"] if unread else 0
    })


# ==============================
# 2. GET ANNOUNCEMENTS (FIXED 'created_at' ERROR)
# ==============================
@admin_notification_bp.route(
    "/admin/notifications",
    methods=["GET"]
)
def get_admin_notifications():
    user_id = session.get("user_id")

    # FIX: We select n.timestamp instead, and sort by a.announcement_id DESC
    announcements = query_db("""
        SELECT
            a.announcement_id,
            a.title,
            a.content,
            a.file_url,
            COALESCE(n.status, 'unread') AS status,
            COALESCE(n.timestamp, NOW()) AS timestamp,
            'announcement' AS type
        FROM announcement a
        LEFT JOIN notification n
            ON a.announcement_id = n.announcement_id
            AND n.user_id = %s
            AND LOWER(n.type) = 'announcement'
        WHERE a.is_deleted = 0
        ORDER BY a.announcement_id DESC
    """, (user_id,)) or []

    return jsonify({
        "notifications": [], 
        "announcements": announcements
    })


# ==============================
# 3. MARK AS READ
# ==============================
@admin_notification_bp.route(
    "/admin/notifications/read",
    methods=["PUT"]
)
def mark_admin_notifications_read():
    user_id = session.get("user_id")
    data = request.get_json() or {}
    announcement_id = data.get("id")

    if not announcement_id:
        return jsonify({"error": "Missing announcement ID"}), 400
    
    clean_id = str(announcement_id).replace("a-", "")

    existing = query_db("""
        SELECT notification_id 
        FROM notification 
        WHERE announcement_id = %s AND user_id = %s AND LOWER(type) = 'announcement'
    """, (clean_id, user_id), one=True)

    if existing:
        execute_db("""
            UPDATE notification
            SET status = 'read'
            WHERE announcement_id = %s AND user_id = %s AND LOWER(type) = 'announcement'
        """, (clean_id, user_id))
    else:
        execute_db("""
            INSERT INTO notification (user_id, announcement_id, type, status, timestamp)
            VALUES (%s, %s, 'Announcement', 'read', NOW())
        """, (user_id, clean_id))

    return jsonify({"message": "Admin announcement marked as read"})