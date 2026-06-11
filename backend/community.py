from flask import Blueprint, session
from extensions import query_db, execute_db

community_bp = Blueprint("community", __name__)


# GET /api/communities
# top 5 PUBLIC communities by member count, except communities the user is already a member
@community_bp.route("/communities", methods=["GET"])
def get_communities():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    communities = query_db(
        """
        SELECT
            c.community_id,
            c.name,
            c.publicity,
            c.admin_id,
            chat.chat_id,
            (
                SELECT COUNT(*)
                FROM community_member
                WHERE community_id = c.community_id
                    AND join_status = 'Joined'
            ) AS member_count

        FROM community c
        JOIN chat ON c.community_id = chat.community_id

        WHERE c.is_deleted = 0
        AND NOT EXISTS (
            SELECT 1
            FROM community_member cm
            WHERE cm.community_id = c.community_id
                AND cm.user_id = %s
                AND cm.join_status IN ('Joined', 'Pending')
        )

        ORDER BY member_count DESC
        LIMIT 5
        """,
        (user_id,)
    )

    if communities == "error":
        return {"error": "Could not load communities"}, 500
    
    for community in communities:
        community["join_status"] = None

    return {"communities": communities or []}


# POST /api/join/<id>
# Join a public community instantly (as a Member).
@community_bp.route("/join/<int:community_id>", methods=["POST"])
def join_community(community_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Make sure the community exists and is Public.
    community = query_db(
        "SELECT publicity, admin_id, name FROM community WHERE community_id = %s",
        (community_id,)
    )
    if community == "error":
        return {"error": "Something went wrong"}, 500
    if not community:
        return {"error": "Community not found"}, 404
    if community[0]["publicity"] != "Public":
        return {"error": "Cannot join a private community here"}, 400

    # Check if already a member.
    existing = query_db(
        "SELECT * FROM community_member WHERE user_id = %s AND community_id = %s",
        (user_id, community_id)
    )
    if existing == "error":
        return {"error": "Something went wrong"}, 500
    if existing:
        return {"error": "Already a member"}, 400

    # Add as Member with 'Joined' status.
    result = execute_db(
        """
        INSERT INTO community_member (user_id, community_id, role, join_status, join_date)
        VALUES (%s, %s, 'Member', 'Joined', NOW())
        """,
        (user_id, community_id)
    )
    if result == "error":
        return {"error": "Could not join"}, 500

    # Get username so the notification can reads.
    me = query_db(
        "SELECT username FROM `user` WHERE user_id = %s",
        (user_id,)
    )
    my_username = me[0]["username"] if me and me != "error" else "Someone"

    # Send a notification to the community's admin.
    admin_id = community[0]["admin_id"]
    community_name = community[0]["name"]

    execute_db(
        """
        INSERT INTO notification (user_id, notification_content, status, type)
        VALUES (%s, %s, 'Unread', 'Notification')
        """,
        (admin_id, f"{my_username} joined {community_name}")
    )

    return {"message": "Joined"}, 200
