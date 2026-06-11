from flask import Blueprint, session, request
from extensions import query_db, execute_db

post_interactions_bp = Blueprint("post_interactions", __name__)


# POST /api/posts/<id>/like - toggle like on a post
@post_interactions_bp.route("/posts/<int:post_id>/like", methods=["POST"])
def toggle_like(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Check if already liked.
    existing = query_db(
        "SELECT * FROM post_like WHERE post_id = %s AND user_id = %s",
        (post_id, user_id)
    )
    if existing == "error":
        return {"error": "Something went wrong"}, 500

    if existing:
        # Already liked - remove the like + lower the count.
        execute_db(
            "DELETE FROM post_like WHERE post_id = %s AND user_id = %s",
            (post_id, user_id)
        )
        execute_db(
            "UPDATE post SET num_of_like = num_of_like - 1 WHERE post_id = %s",
            (post_id,)
        )
        return {"liked": False}
    else:
        # Not liked yet - add the like + raise the count.
        execute_db(
            "INSERT INTO post_like (post_id, user_id) VALUES (%s, %s)",
            (post_id, user_id)
        )
        execute_db(
            "UPDATE post SET num_of_like = num_of_like + 1 WHERE post_id = %s",
            (post_id,)
        )
        return {"liked": True}


# POST /api/posts/<id>/favorite - toggle bookmark on a post
@post_interactions_bp.route("/posts/<int:post_id>/favorite", methods=["POST"])
def toggle_favorite(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    existing = query_db(
        "SELECT * FROM post_favorite WHERE post_id = %s AND user_id = %s",
        (post_id, user_id)
    )
    if existing == "error":
        return {"error": "Something went wrong"}, 500

    if existing:
        execute_db(
            "DELETE FROM post_favorite WHERE post_id = %s AND user_id = %s",
            (post_id, user_id)
        )
        return {"favorited": False}
    else:
        execute_db(
            "INSERT INTO post_favorite (post_id, user_id) VALUES (%s, %s)",
            (post_id, user_id)
        )
        return {"favorited": True}


# GET /api/posts/<id> - get a single post (for the post detail page)
@post_interactions_bp.route("/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    posts = query_db(
        """
        SELECT p.post_id, p.user_id, u.username, u.profile_pic, p.title, p.description,
               p.timestamp, p.num_of_like, p.num_of_comment
        FROM post p
        JOIN `user` u ON p.user_id = u.user_id
        WHERE p.post_id = %s AND p.is_deleted = 0
        """,
        (post_id,)
    )
    if posts == "error":
        return {"error": "Something went wrong"}, 500
    if not posts:
        return {"error": "Post not found"}, 404

    post = posts[0]
    post["timestamp"] = str(post["timestamp"])

    # Attach the media, hashtags and like/favorite state before sending.
    from home_feed import attach_media, attach_hashtags, attach_user_state
    attach_media([post])
    attach_hashtags([post])
    attach_user_state([post], user_id)

    return {"data": post}


# GET /api/posts/<id>/comments - list all comments on a post (oldest first)
@post_interactions_bp.route("/posts/<int:post_id>/comments", methods=["GET"])
def get_comments(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    comments = query_db(
        """
        SELECT c.post_comment_id, c.user_id, u.username, c.comment
        FROM post_comment c
        JOIN `user` u ON c.user_id = u.user_id
        WHERE c.post_id = %s
        ORDER BY c.post_comment_id ASC
        """,
        (post_id,)
    )
    if comments == "error":
        return {"error": "Could not load comments"}, 500

    return {"data": comments or []}


# POST /api/posts/<id>/comments - add a comment to a post
@post_interactions_bp.route("/posts/<int:post_id>/comments", methods=["POST"])
def add_comment(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    data = request.get_json(silent=True) or {}
    comment_text = (data.get("comment") or "").strip()

    if not comment_text:
        return {"error": "Comment cannot be empty"}, 400

    # Save the comment.
    new_id = execute_db(
        "INSERT INTO post_comment (post_id, user_id, comment) VALUES (%s, %s, %s)",
        (post_id, user_id, comment_text)
    )
    if new_id == "error":
        return {"error": "Could not add comment"}, 500

    # Raise the comment count on the post.
    execute_db(
        "UPDATE post SET num_of_comment = num_of_comment + 1 WHERE post_id = %s",
        (post_id,)
    )

    return {"data": {
        "post_comment_id": new_id,
        "comment": comment_text
    }}
