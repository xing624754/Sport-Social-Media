from flask import Blueprint, request, session, current_app, send_from_directory
from extensions import query_db, execute_db, socketIO
from datetime import datetime, date
import os
import json
from ai_moderation import check_content, check_hashtags

posting_bp = Blueprint("user_posting", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.getcwd()), 'uploads', 'posts')

@posting_bp.route('/uploads/posts/<filename>')
def serve_post_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

def get_photo_letter(index):
        # Returns 'a' for index 0, 'b' for index 1, etc.
    return chr(ord('a') + index)

def perform_ai_moderation(post_owner_id, post_id, description, media_paths=None, community_post_id=None):
    is_flagged, reason = check_content(description, media_paths)
    print(f"AI Moderation Output - Flagged: {is_flagged}, Reason: {reason}", flush=True)
    if is_flagged:
        # Check if a pending report already exists for this post
        existing_report = query_db(
            "select report_id from report where post_id = %s and status = 'Pending'",
            (post_id,)
        )
        if not existing_report or existing_report == "error":
            execute_db(
                """
                insert into report (user_id, account_id, post_id, community_post_id, type, description, passed_ai_check, status, admin_id)
                values (NULL, %s, %s, %s, 'Post', %s, 1, 'Pending', NULL)
                """,
                (post_owner_id, post_id, community_post_id, reason)
            )

    # Moderate hashtags associated with the post
    post_hashtags = query_db(
        """
        select h.hashtag_id, h.name 
        from hashtag h
        join post_hashtag ph on h.hashtag_id = ph.hashtag_id
        where ph.post_id = %s
        """,
        (post_id,)
    )
    if post_hashtags and post_hashtags != "error":
        hashtag_names = [h["name"] for h in post_hashtags]
        violating_hashtags = check_hashtags(hashtag_names)
        if violating_hashtags:
            print(f"AI Hashtag Moderation - Violating: {violating_hashtags}", flush=True)
            for h in post_hashtags:
                if h["name"].lower() in violating_hashtags:
                    # Remove post-hashtag association
                    execute_db(
                        "delete from post_hashtag where post_id = %s and hashtag_id = %s",
                        (post_id, h["hashtag_id"])
                    )
                    # Decrement use count
                    execute_db(
                        "update hashtag set num_of_use = num_of_use - 1 where hashtag_id = %s",
                        (h["hashtag_id"],)
                    )
                    # Delete the hashtag itself if no longer used by any posts
                    execute_db(
                        "delete from hashtag where hashtag_id = %s and num_of_use <= 0",
                        (h["hashtag_id"],)
                    )

@posting_bp.route("/hashtags", methods=["GET"])
def get_hashtags():
    query = request.args.get("q", "").strip().lower()
    
    if not query:
        hashtags = query_db(
            "select name from hashtag order by num_of_use desc limit 10"
        )
    else:
        hashtags = query_db(
            "select name from hashtag where name like %s order by num_of_use desc limit 10",
            (f"{query}%",)
        )

    hashtag_list = [h["name"] for h in (hashtags or [])]
    return {"hashtags": hashtag_list}

@posting_bp.route("/user-post", methods = ["GET", "POST"])
def user_create_new_post():
    user_id = session.get("user_id")

    if not user_id:
        return {"error": "You must login"}, 401

    if request.method == "GET":
        communities = query_db(
            """
            select community.community_id, community.name
            from community
            join community_member
            on community_member.community_id = community.community_id
            where community_member.user_id = %s
              and community_member.join_status = 'Joined'
              and community.is_deleted = 0
            """,
            (user_id,)
        )

        return {"communities": communities}

    if request.is_json:
        data = request.json
        user_new_post = data.get("user_new_post")
    else:
        user_new_post = json.loads(request.form.get("user_new_post", "{}"))

    timestamp = datetime.now()
    today = date.today()
    description = user_new_post.get("description")
    if isinstance(description, str):
        description = description[:5000]
    publicity = user_new_post.get("publicity")
    title = user_new_post.get("title")
    if isinstance(title, str):
        title = title[:100]

    hashtags = user_new_post.get("hashtags", [])
    media_urls = user_new_post.get("media_urls", [])

    execute_db(
        """
            insert into post (user_id, timestamp, description, publicity, is_deleted,
            num_of_like, num_of_comment, title, type) values(%s, %s, %s, %s, 0, 0, 0, %s, %s)
        
        """,
        (user_id,timestamp,description,publicity,title,"Post")
    )

    result = query_db("SELECT LAST_INSERT_ID()")
    post_id = result[0]["LAST_INSERT_ID()"]

    if 'media' in request.files:
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        files = request.files.getlist('media')
        for index, file in enumerate(files):
            if file and file.filename:

                    ext = os.path.splitext(file.filename)[1]
                    # New filename: post_id + letter (a, b, c...) + extension
                    filename = f"{post_id}{get_photo_letter(index)}{ext}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    
                    url = f"/uploads/posts/{filename}"
                    media_urls.append(url)

    media_paths = []
    if os.path.exists(UPLOAD_FOLDER):
        for f in os.listdir(UPLOAD_FOLDER):
            if f.startswith(str(post_id)):
                media_paths.append(os.path.join(UPLOAD_FOLDER, f))

    if publicity == "Community":

        community_ids = user_new_post.get("community_ids", [])

        if not community_ids:
            return {"error": "Please select at least one community"}, 400

        for community_id in community_ids:

            execute_db(
                """
                insert into community_post (
                    post_id,
                    community_id,
                    is_deleted
                )
                values (%s, %s, 0)
                """,
                (post_id, community_id)
            )

        cp_result = query_db("SELECT LAST_INSERT_ID() as cp_id")
        community_post_id = cp_result[0]["cp_id"] if cp_result else None
    else:
        community_post_id = None

    for hashtag in hashtags:
        tag = hashtag.strip().lower()[:30]

        existing_hashtag = query_db(
            """
            select hashtag_id from hashtag 
            where name = %s
            """,
            (tag,)
        )

        if existing_hashtag:
            hashtag_id = existing_hashtag[0]["hashtag_id"]

        else:
            execute_db(
                """
                insert into hashtag(name, date_created, num_of_use) values (%s, %s, 0)
                """,
                (tag, today,)
            )

            new_hashtag = query_db(
                """
                select hashtag_id from hashtag 
                where name = %s
                """,
                (tag,)
            )
            hashtag_id = new_hashtag[0]["hashtag_id"]


        execute_db(
            """
            insert into post_hashtag (hashtag_id, post_id)
            values (%s, %s)
            """,
            (hashtag_id, post_id,)
        )

        execute_db(
            "update hashtag set num_of_use = num_of_use + 1 where hashtag_id = %s",
            (hashtag_id,)
        )

    for media in media_urls:
        execute_db(
            """
            insert into post_media(post_id, media_url) values (%s, %s)
            """,
            (post_id, media)
        )
    
    perform_ai_moderation(user_id, post_id, description, media_paths, community_post_id)
    
    socketIO.emit("new_post_created", {
        "post_id": post_id,
        "user_id": user_id,
        "publicity": publicity
    })
    
    return {"message": "Post created successfully"}
    


@posting_bp.route("/edit-user-post/<int:post_id>", methods = ["GET", "PUT"])
def edit_user_post(post_id):

    user_id = session.get("user_id")

    if not user_id:
        return {"error": "You must login"}, 401


    if request.method == "GET":

        post = query_db(
            """
            select * from post
            where post_id = %s
            and user_id = %s
            and is_deleted = 0
            """,
            (post_id, user_id)
        )

        if not post:
            return {"error": "Post not found"}, 404

        hashtags = query_db(
            """
            select hashtag.name from hashtag
            join post_hashtag
            on post_hashtag.hashtag_id = hashtag.hashtag_id
            where post_hashtag.post_id = %s
            """,
            (post_id,)
        )

        media = query_db(
            """
            select media_url
            from post_media
            where post_id = %s
            """,
            (post_id,)
        )

        return {
            "post": {
                "post_id": post[0]["post_id"],
                "title": post[0]["title"],
                "description": post[0]["description"],
                "publicity": post[0]["publicity"],
                "hashtags": [h["name"] for h in hashtags],
                "media_urls": [m["media_url"] for m in media]
            }
        }

    if request.method == "PUT":
        data = request.json
        title = data.get("title")
        if isinstance(title, str):
            title = title[:100]
        description = data.get("description")
        if isinstance(description, str):
            description = description[:5000]
        new_hashtags = data.get("hashtags", [])
        remaining_media = data.get("media_urls", []) # List of media URLs to KEEP

        # 1. Update Post Title and Description (Publicity cannot be changed)
        execute_db(
            "update post set title = %s, description = %s where post_id = %s",
            (title, description, post_id)
        )

        # 2. Handle Hashtags (Decrement old ones, then add new ones)
        old_hashtags = query_db(
            "select hashtag_id from post_hashtag where post_id = %s",
            (post_id,)
        )
        
        for h in old_hashtags:
            hid = h["hashtag_id"]
            execute_db("update hashtag set num_of_use = num_of_use - 1 where hashtag_id = %s", (hid,))
        
        execute_db("delete from post_hashtag where post_id = %s", (post_id,))

        for tag_name in new_hashtags:
            tag = tag_name.strip().lower()[:30]
            # Find or create hashtag
            existing = query_db("select hashtag_id from hashtag where name = %s", (tag,))
            if existing:
                hashtag_id = existing[0]["hashtag_id"]
            else:
                execute_db("insert into hashtag(name, date_created, num_of_use) values (%s, %s, 0)", (tag, date.today()))
                hashtag_id = query_db("select hashtag_id from hashtag where name = %s", (tag,))[0]["hashtag_id"]
            
            execute_db("insert into post_hashtag(hashtag_id, post_id) values (%s, %s)", (hashtag_id, post_id))
            execute_db("update hashtag set num_of_use = num_of_use + 1 where hashtag_id = %s", (hashtag_id,))

        current_media = query_db("select media_url from post_media where post_id = %s", (post_id,))
        for m in current_media:
            url = m["media_url"]
            if url not in remaining_media:
                execute_db("delete from post_media where post_id = %s and media_url = %s", (post_id, url))

        media_paths = []
        for url in remaining_media:
            filename = url.split('/')[-1]
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(filepath):
                media_paths.append(filepath)

        cp_info = query_db("select community_post_id from community_post where post_id = %s", (post_id,))
        cp_id = cp_info[0]["community_post_id"] if cp_info else None
        
        perform_ai_moderation(user_id, post_id, description, media_paths, cp_id)

        return {"message": "Post updated successfully"}

@posting_bp.route("/delete-user-post/<int:post_id>", methods = ["DELETE"])
def delete_user_post(post_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    execute_db("update post set is_deleted = 1 where post_id = %s and user_id = %s", (post_id, user_id))

    hashtags = query_db("select hashtag_id from post_hashtag where post_id = %s", (post_id,))
    for h in hashtags:
        execute_db("update hashtag set num_of_use = num_of_use - 1 where hashtag_id = %s", (h["hashtag_id"],))

    execute_db("delete from post_hashtag where post_id = %s", (post_id,))

    return {"message": "Post deleted successfully"}
