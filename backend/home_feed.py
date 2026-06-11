from flask import Blueprint, request, session
from extensions import query_db

home_feed_bp = Blueprint("home_feed", __name__)


# GET data for the home feed, with the chosen tab (recommended/following/community).
@home_feed_bp.route("/home-feed", methods=["GET"])
def get_home_feed():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Which tab the user is viewing 
    # default: recommended.
    tab = request.args.get("tab", "recommended")
    exclude_self = request.args.get("exclude_self", "true").lower() == "true"

    if tab == "recommended":
        posts = get_recommended_posts(user_id)
    elif tab == "following":
        posts = get_following_posts(user_id)
    elif tab == "community":
        posts = get_community_posts(user_id)
    else:
        return {"error": "Unknown tab"}, 400

    if posts == "error":
        return {"error": "Could not load the feed"}, 500

    # Tidy up each post (format the date, attach images) before sending.
    posts = clean_posts(posts, user_id)

    if exclude_self:
        posts = [p for p in posts if p["user_id"] != user_id]

    return {"data": posts}


# GET search results - public posts whose title or description contains the typed text.
@home_feed_bp.route("/search-posts", methods=["GET"])
def search_posts():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # The word(s) the user typed. If empty, return nothing.
    keyword = request.args.get("q", "").strip()
    if not keyword:
        return {"data": []}

    # LIKE needs % around the word, e.g. "%run%" matches anything containing "run".
    like = f"%{keyword}%"

    posts = query_db(
        """
        SELECT p.post_id, p.user_id, u.username, u.profile_pic, p.title, p.description,
               p.timestamp, p.num_of_like, p.num_of_comment
        FROM post p
        JOIN `user` u ON p.user_id = u.user_id
        WHERE p.is_deleted = 0
            AND p.type = 'Post'
            AND p.publicity = 'Public'
            AND p.post_id NOT IN (SELECT post_id FROM report WHERE post_id IS NOT NULL AND status = 'Pending')
            AND (p.title LIKE %s OR p.description LIKE %s)
        ORDER BY p.timestamp DESC
        """,
        (like, like)
    )

    if posts == "error":
        return {"error": "Search failed"}, 500

    # Same tidy-up as the feed (attach images + like/favorite state).
    posts = clean_posts(posts, user_id)

    return {"data": posts}


# Recommended: shows ALL public posts, ordered by:
#   1. preference - posts by people who like the user's sport come first
#   2. popularity - within that, posts with the most likes come first
#   3. freshness  - newest first when the like counts are equal
# The user's sport is chosen at sign-up and stored in the user_detail table.
def get_recommended_posts(user_id):
    return query_db(
        """
        SELECT p.post_id, p.user_id, u.username, u.profile_pic, p.title, p.description, p.timestamp, p.num_of_like, p.num_of_comment
        FROM post p
        JOIN `user` u ON p.user_id = u.user_id
        WHERE p.is_deleted = 0
            AND p.type = 'Post'
            AND p.publicity = 'Public'
            AND p.post_id NOT IN (SELECT post_id FROM report WHERE post_id IS NOT NULL AND status = 'Pending')
        ORDER BY
            DATE(p.timestamp) DESC,
            CASE WHEN p.user_id IN (
                SELECT ud.user_id FROM user_detail ud
                WHERE ud.sport IN (SELECT sport FROM user_detail WHERE user_id = %s)
            ) THEN 0 ELSE 1 END,
            p.num_of_like DESC,
            p.timestamp DESC
        """,
        (user_id,)
    )


# Following: posts written by people the user follows.
def get_following_posts(user_id):
    return query_db(
        """
        SELECT p.post_id, p.user_id, u.username, u.profile_pic, p.title, p.description, p.timestamp, p.num_of_like, p.num_of_comment
        FROM post p
        JOIN `user` u ON p.user_id = u.user_id
        WHERE p.is_deleted = 0
            AND p.type = 'Post'
            AND p.publicity = 'Public'
            AND p.post_id NOT IN (SELECT post_id FROM report WHERE post_id IS NOT NULL AND status = 'Pending')
            AND p.user_id IN (SELECT followed_id FROM follower WHERE follower_id = %s)
        ORDER BY p.timestamp DESC
        """,
        (user_id,)
    )


# Community: posts from the communities the user has joined.
def get_community_posts(user_id):
    return query_db(
        """
        SELECT p.post_id, p.user_id, u.username, u.profile_pic, p.title, p.description, p.timestamp, p.num_of_like, p.num_of_comment,
               c.name AS community_name
        FROM post p
        JOIN `user` u ON p.user_id = u.user_id
        JOIN community_post cp ON p.post_id = cp.post_id
        JOIN community c ON c.community_id = cp.community_id
        WHERE p.is_deleted = 0
            AND p.type = 'Post'
            AND p.post_id NOT IN (SELECT post_id FROM report WHERE post_id IS NOT NULL AND status = 'Pending')
            AND cp.is_deleted = 0
            AND cp.community_id IN (
                SELECT community_id FROM community_member
                WHERE user_id = %s AND join_status = 'Joined'
            )
        ORDER BY p.timestamp DESC
        """,
        (user_id,)
    )


# Tidy each post: format the timestamp and attach its images.
def clean_posts(posts, user_id):
    # No posts -> return an empty list.
    if not posts:
        return []

    # str() turns it into simple text
    #  "2026-05-18 14:30:00".
    for post in posts:
        post["timestamp"] = str(post["timestamp"])

    # Give every post a 'media_urls' list (its images).
    attach_media(posts)

    # Give every post a 'hashtags' list (its hashtag names).
    attach_hashtags(posts)

    # Add is_liked / is_favorited flags for the current user.
    attach_user_state(posts, user_id)
    return posts


# Look up the images for the given posts and attach them as 'media_urls'.
def attach_media(posts):
    post_ids = [post["post_id"] for post in posts]

    # Build "%s, %s, %s" , one placeholder for each post id.
    placeholders = ", ".join(["%s"] * len(post_ids))

    media_rows = query_db(
        "SELECT post_id, media_url FROM post_media WHERE post_id IN (" + placeholders + ")",
        tuple(post_ids)
    )

    if media_rows == "error":
        media_rows = []

    # Group the image urls by their post_id.
    media_by_post = {}
    for row in media_rows:
        media_by_post.setdefault(row["post_id"], []).append(row["media_url"])

    # Every post gets a media_urls list 
    # empty if it has no images.
    for post in posts:
        post["media_urls"] = media_by_post.get(post["post_id"], [])


# Look up the hashtags for the given posts and attach them as 'hashtags'.
def attach_hashtags(posts):
    post_ids = [post["post_id"] for post in posts]

    # Build "%s, %s, %s", one placeholder for each post id.
    placeholders = ", ".join(["%s"] * len(post_ids))

    tag_rows = query_db(
        "SELECT ph.post_id, h.name FROM post_hashtag ph "
        "JOIN hashtag h ON ph.hashtag_id = h.hashtag_id "
        "WHERE ph.post_id IN (" + placeholders + ")",
        tuple(post_ids)
    )

    if tag_rows == "error":
        tag_rows = []

    # Group the hashtag names by their post_id.
    tags_by_post = {}
    for row in tag_rows:
        tags_by_post.setdefault(row["post_id"], []).append(row["name"])

    # Every post gets a hashtags list 
    # empty if it has none.
    for post in posts:
        post["hashtags"] = tags_by_post.get(post["post_id"], [])


# For each post, mark whether the current user has liked / favorited it.
def attach_user_state(posts, user_id):
    if not posts:
        return

    post_ids = [post["post_id"] for post in posts]
    placeholders = ", ".join(["%s"] * len(post_ids))

    # Which of these posts has the user liked?
    liked_rows = query_db(
        "SELECT post_id FROM post_like WHERE user_id = %s AND post_id IN (" + placeholders + ")",
        tuple([user_id] + post_ids)
    )
    liked_ids = {row["post_id"] for row in liked_rows} if liked_rows and liked_rows != "error" else set()

    # Which of these posts has the user favorited?
    fav_rows = query_db(
        "SELECT post_id FROM post_favorite WHERE user_id = %s AND post_id IN (" + placeholders + ")",
        tuple([user_id] + post_ids)
    )
    fav_ids = {row["post_id"] for row in fav_rows} if fav_rows and fav_rows != "error" else set()

    # Tag each post with these two booleans.
    for post in posts:
        post["is_liked"] = post["post_id"] in liked_ids
        post["is_favorited"] = post["post_id"] in fav_ids
