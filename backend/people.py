from flask import Blueprint, session, request
from extensions import query_db, execute_db

people_bp = Blueprint("people", __name__)


# GET /api/people
# top 5 most-followed users, except: the logged-in user and anyone the user already follows.
@people_bp.route("/people", methods=["GET"])
def get_people():
    # find out who is logged in.
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Ask the database for the top 5 most-followed users,
    # but skip the logged-in user and that already follow.
    people = query_db(
        """
        SELECT
            u.user_id,
            u.username,
            u.profile_pic,
            (
                SELECT COUNT(*)
                FROM follower
                WHERE followed_id = u.user_id
            ) AS follower_count
        FROM `user` u
        WHERE u.user_id != %s
            AND u.role = 'User'
            AND u.status = 'Active'
            AND u.user_id NOT IN (
                SELECT followed_id FROM follower WHERE follower_id = %s
            )
        ORDER BY follower_count DESC
        LIMIT 5
        """,
        (user_id, user_id)
    )

    if people == "error":
        return {"error": "Could not load people"}, 500

    # Return the list. If empty, send back an empty list.
    return {"data": people or []}


# GET /api/people/search?q=<username> — search active users by username.
@people_bp.route("/people/search", methods=["GET"])
def search_people():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    q = (request.args.get("q") or "").strip()
    if not q:
        return {"data": []}

    people = query_db(
        """
        SELECT u.user_id, u.username, u.profile_pic,
               EXISTS(
                   SELECT 1 FROM follower f
                   WHERE f.follower_id = %s AND f.followed_id = u.user_id
               ) AS is_following
        FROM `user` u
        WHERE u.role = 'User' AND u.status = 'Active'
          AND u.username LIKE %s AND u.user_id != %s
        ORDER BY u.username ASC
        LIMIT 10
        """,
        (user_id, f"%{q}%", user_id)
    )
    if people == "error":
        return {"error": "Search failed"}, 500

    return {"data": people or []}


# POST /api/follow/<id>
# Follow a user. Also sends them a notification.
@people_bp.route("/follow/<int:target_user_id>", methods=["POST"])
def follow_user(target_user_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Cannot follow yourself.
    if user_id == target_user_id:
        return {"error": "Cannot follow yourself"}, 400

    # If already following, do nothing.
    existing = query_db(
        "SELECT * FROM follower WHERE follower_id = %s AND followed_id = %s",
        (user_id, target_user_id)
    )
    if existing == "error":
        return {"error": "Something went wrong"}, 500
    if existing:
        return {"error": "Already following"}, 400

    # Add the follow relationship.
    result = execute_db(
        "INSERT INTO follower (follower_id, followed_id) VALUES (%s, %s)",
        (user_id, target_user_id)
    )
    if result == "error":
        return {"error": "Could not follow"}, 500

    # Get username so the notification can read..
    me = query_db(
        "SELECT username FROM `user` WHERE user_id = %s",
        (user_id,)
    )
    my_username = me[0]["username"] if me and me != "error" else "Someone"

    # Send the followed user a notification.
    execute_db(
        """
        INSERT INTO notification (user_id, notification_content, status, type)
        VALUES (%s, %s, 'Unread', 'Notification')
        """,
        (target_user_id, f"{my_username} followed you")
    )

    return {"message": "Followed"}, 200

# unfollow a user. Also sends them a notification.
@people_bp.route("/unfollow/<int:target_user_id>", methods=["POST"])
def unfollow_user(target_user_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    result = execute_db(
        "DELETE FROM follower WHERE follower_id = %s AND followed_id = %s",
        (user_id, target_user_id)
    )
    if result == "error":
        return {"error": "Could not unfollow"}, 500

    return {"message": "Unfollowed"}, 200
