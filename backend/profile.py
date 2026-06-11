from flask import Blueprint, current_app, jsonify, request, session
from extensions import mysql
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import json
from extensions import calculate_age
from auth import is_password_valid

profile_bp = Blueprint("profile", __name__)

UPLOAD_FOLDER = "uploads"

@profile_bp.route("/verify-current-password", methods=["POST"])
def verify_current_password():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"message": "Unauthorized"}), 401

    data = request.json
    current_password = data.get("current_password")
    if not current_password:
        return jsonify({"message": "Current password is required"}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("SELECT password FROM user WHERE user_id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not check_password_hash(user[0], current_password):
        return jsonify({"message": "Incorrect current password."}), 400

    return jsonify({"message": "Verified"})


# GET CURRENT LOGGED IN USER
@profile_bp.route("/user-profile", methods=["GET"])
def get_current_user():

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({
            "message": "Unauthorized"
        }), 401

    return jsonify({
        "user_id": user_id
    })


# GET USER PROFILE
@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    cursor = mysql.connection.cursor()

    # USER DETAILS
    cursor.execute("""
        SELECT 
            u.user_id,
            u.username,
            u.email,
            u.gender,
            u.birthdate,
            u.profile_pic,
            sc.category_id,
            sc.name AS sport_category,
            sl.skill_level_id,
            sl.name AS skill_level
        FROM user u
        LEFT JOIN user_detail ud ON u.user_id = ud.user_id
        LEFT JOIN sport_category sc ON ud.sport = sc.category_id
        LEFT JOIN skill_level sl ON ud.skill_level = sl.skill_level_id
        WHERE u.user_id = %s
    """, (user_id,))

    user = cursor.fetchall()

    if not user:
        cursor.close()
        return jsonify({"message": "User not found"}), 404

    # Calculate Age safely using the birthday field (column index 4)
    user_birthdate = user[0][4]
    user_age = None
    if user_birthdate:
        try:
            user_age = calculate_age(user_birthdate)
        except Exception as e:
            print("Error calculating age:", e)

    # TAGS
    tags = []
    for row in user:
        if row[6] and row[8]:
            tags.append({
                "sport_id": row[6],
                "sport": row[7],
                "skill_level_id": row[8],
                "skill_level": row[9]
            })

    # POST COUNT
    cursor.execute("""
        SELECT COUNT(*)
        FROM post
        WHERE user_id = %s
        AND is_deleted = 0
    """, (user_id,))

    post_count = cursor.fetchone()[0]

    # FAVORITE COUNT
    cursor.execute("""
        SELECT COUNT(*)
        FROM post_favorite
        WHERE user_id = %s
    """, (user_id,))

    favorite_count = cursor.fetchone()[0]

    # FOLLOWER COUNT
    cursor.execute("""
        SELECT COUNT(*)
        FROM follower
        WHERE followed_id = %s
    """, (user_id,))

    follower_count = cursor.fetchone()[0]

    # FOLLOWING COUNT
    cursor.execute("""
        SELECT COUNT(*)
        FROM follower
        WHERE follower_id = %s
    """, (user_id,))

    following_count = cursor.fetchone()[0]

    # check user is following or not
    viewer_id = session.get("user_id")
    cursor.execute("""
        SELECT 1
        FROM follower
        WHERE follower_id = %s
        AND followed_id = %s
    """, (viewer_id, user_id))

    is_following = cursor.fetchone() is not None

    cursor.close()

    return jsonify({
        "user": {
            "user_id": user[0][0],
            "username": user[0][1],
            "email": user[0][2],
            "gender": user[0][3],
            "birthdate": str(user[0][4]) if user[0][4] else None,
            "age": user_age,  # <--- Sent directly to frontend
            "profile_pic": user[0][5],
            "tags": tags,
            "post_count": post_count,
            "favorite_count": favorite_count,
            "follower_count": follower_count,
            "following_count": following_count,
            "is_following": is_following
        }
    })

# GET USER POSTS
@profile_bp.route("/user-posts/<int:user_id>", methods=["GET"])
def get_user_posts(user_id):
    # Use DictCursor so we can access values by database column name instead of numbers
    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT 
            p.post_id,
            p.description,
            p.timestamp,
            COALESCE(l.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count,
            pm.media_url,
            EXISTS (
                SELECT 1 
                FROM report r 
                WHERE r.post_id = p.post_id 
                AND r.status = 'Pending'
            ) AS is_pending
        FROM post p
        
        LEFT JOIN post_media pm 
            ON p.post_id = pm.post_id

        LEFT JOIN (
            SELECT post_id, COUNT(*) AS like_count
            FROM post_like
            GROUP BY post_id
        ) l ON p.post_id = l.post_id

        LEFT JOIN (
            SELECT post_id, COUNT(*) AS comment_count
            FROM post_comment
            GROUP BY post_id
        ) c ON p.post_id = c.post_id

        WHERE p.user_id = %s
        AND p.is_deleted = 0
        AND p.type = 'post'
        ORDER BY p.timestamp DESC
    """, (user_id,))

    posts = cursor.fetchall()
    cursor.close()

    post_dict = {}
    for post in posts:   
        post_id = post[0]
        caption = post[1]
        created_at = post[2]
        likes = post[3]
        comments = post[4]
        media_url = post[5]
        is_pending = bool(post[6]) # Safely captured on every iteration row context

        if post_id not in post_dict:
            post_dict[post_id] = {
                "post_id": post_id,
                "caption": caption,
                "created_at": created_at,
                "likes": likes,
                "comments": comments,
                "is_pending_review": is_pending, # Assigned cleanly here
                "media": []
            }
        else:
            # If the post is already tracked, ensure a multi-media row doesn't reset a True status
            if is_pending:
                post_dict[post_id]["is_pending_review"] = True
    
        if media_url:  
            post_dict[post_id]["media"].append(media_url)

    return jsonify({
        "posts": list(post_dict.values())
    })

# GET FAVORITE POSTS
@profile_bp.route("/favorite-posts/<int:user_id>", methods=["GET"])
def get_favorite_posts(user_id):

    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT 
            p.post_id,
            pm.media_url,
            p.description,
            p.timestamp,
            COALESCE(l.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count
        FROM post_favorite pf
        JOIN post p
            ON pf.post_id = p.post_id
        LEFT JOIN post_media pm
            ON p.post_id = pm.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS like_count
            FROM post_like
            GROUP BY post_id
        ) l ON p.post_id = l.post_id
        LEFT JOIN (
            SELECT post_id, COUNT(*) AS comment_count
            FROM post_comment
            GROUP BY post_id
        ) c ON p.post_id = c.post_id
        WHERE pf.user_id = %s
        AND p.is_deleted = 0
        AND p.type = 'post'
        ORDER BY p.timestamp DESC
    """, (user_id,))

    posts = cursor.fetchall()
    cursor.close()

    # Use a dictionary to eliminate duplicates caused by SQL joins
    favorite_posts_dict = {}

    for post in posts:
        post_id = post[0]
        media_url = post[1]
        caption = post[2]
        created_at = post[3]
        likes = post[4]
        comments = post[5]

        if post_id not in favorite_posts_dict:
            favorite_posts_dict[post_id] = {
                "post_id": post_id,
                "caption": caption,
                "created_at": created_at,
                "likes": likes,
                "comments": comments,
                "media": [] # Changed to 'media' array to match frontend schema expectations
            }
        
        # Append media if it exists and hasn't already been added
        if media_url and media_url not in favorite_posts_dict[post_id]["media"]:
            favorite_posts_dict[post_id]["media"].append(media_url)

    return jsonify({
        "favorite_posts": list(favorite_posts_dict.values())
    })

# GET USER FOLLOWERS
@profile_bp.route("/user-followers/<int:user_id>", methods=["GET"])
def get_user_followers(user_id):
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT u.user_id, u.username, u.profile_pic 
        FROM follower f
        JOIN user u ON f.follower_id = u.user_id
        WHERE f.followed_id = %s
    """, (user_id,))
    followers = cursor.fetchall()
    cursor.close()

    follower_list = [{
        "user_id": row[0],
        "username": row[1],
        "profile_pic": row[2]
    } for row in followers]

    return jsonify({"followers": follower_list})


# GET USER FOLLOWING
@profile_bp.route("/user-following/<int:user_id>", methods=["GET"])
def get_user_following(user_id):
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT u.user_id, u.username, u.profile_pic 
        FROM follower f
        JOIN user u ON f.followed_id = u.user_id
        WHERE f.follower_id = %s
    """, (user_id,))
    following = cursor.fetchall()
    cursor.close()

    following_list = [{
        "user_id": row[0],
        "username": row[1],
        "profile_pic": row[2]
    } for row in following]

    return jsonify({"following": following_list})

## Edit profile feature

@profile_bp.route("/sport", methods=["GET"])
def get_sports():

    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT category_id, name
        FROM sport_category
    """)

    sports = cursor.fetchall()

    cursor.close()

    sport_list = []

    for sport in sports:

        sport_list.append({
            "sport_id": sport[0],
            "name": sport[1]
        })

    return jsonify(sport_list)

@profile_bp.route("/skill-level", methods=["GET"])
def get_skill_levels():

    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT skill_level_id, name
        FROM skill_level
    """)

    levels = cursor.fetchall()

    cursor.close()

    skill_list = []

    for level in levels:

        skill_list.append({
            "skill_level_id": level[0],
            "name": level[1]
        })

    return jsonify({
        "skill_levels": skill_list
    })
# update profile
@profile_bp.route("/edit-profile/<int:user_id>", methods=["PUT"])
def edit_profile(user_id):

    cursor = mysql.connection.cursor()

    username = request.form.get("username")
    email = request.form.get("email")
    gender = request.form.get("gender")
    birthdate = request.form.get("birthdate")

    if email:
        cursor.execute("SELECT user_id FROM user WHERE email = %s AND user_id != %s", (email, user_id))
        duplicate = cursor.fetchone()
        if duplicate:
            cursor.close()
            return jsonify({"message": "Email is already taken by another user."}), 400

    current_password = request.form.get("current_password")
    new_password = request.form.get("new_password")
    confirm_password = request.form.get("confirm_password")

    profile_pic = request.files.get("profile_pic")

    preferences_new = request.form.get("preferences")
    preferences = json.loads(preferences_new) if preferences_new else []

    # DEBUG
    print("FORM DATA:", request.form)
    print("FILES:", request.files)

    profile_pic = request.files.get("profile_pic")
    image_path = None

    # upload profile pic
    if profile_pic:
        try:
            UPLOAD_FOLDER = current_app.config["UPLOAD_FOLDER"]

            ext = os.path.splitext(profile_pic.filename)[1]
            filename = f"{user_id}{ext}"

            profile_folder = os.path.join(UPLOAD_FOLDER, "profile_pics")
            os.makedirs(profile_folder, exist_ok=True)

            filepath = os.path.join(profile_folder, filename)
            profile_pic.save(filepath)

            image_path = f"/uploads/profile_pics/{filename}"

            print("IMAGE SAVED:", image_path)

        except Exception as e:
            print("IMAGE UPLOAD ERROR:", str(e))
            return jsonify({"message": "Image upload failed"}), 500

    # update user table
    if image_path:

        cursor.execute("""
            UPDATE user
            SET
                username = %s,
                email = %s,
                gender = %s,
                birthdate = %s,
                profile_pic = COALESCE(%s, profile_pic)
            WHERE user_id = %s
        """, (
            username,
            email,
            gender,
            birthdate,
            image_path,
            user_id
        ))

    else:

        cursor.execute("""
            UPDATE user
            SET
                username = %s,
                email = %s,
                gender = %s,
                birthdate = %s
            WHERE user_id = %s
        """, (
            username,
            email,
            gender,
            birthdate,
            user_id
        ))

    # UPDATE PASSWORD
    if new_password:

        if new_password != confirm_password:
            return jsonify({
                "message": "Passwords do not match"
            }), 400

        valid_password, error_msg = is_password_valid(new_password)
        if not valid_password:
            return jsonify({
                "message": error_msg
            }), 400

        hashed_password = generate_password_hash(
            new_password,
            method="scrypt"
        )

        cursor.execute("""
            UPDATE user
            SET password = %s
            WHERE user_id = %s
        """, (
            hashed_password,
            user_id
        ))

    ## Sport preferences section
    # remove existing preferences
    cursor.execute("""
        DELETE FROM user_detail
        WHERE user_id = %s
    """, (user_id,))

    has_duplicate = set()

    # add new preferences
    for pref in preferences:

        sport = pref.get("sport")
        skill_level = pref.get("skillLevel") #retrieve skill level from frontend, so is skillLevel

        if not sport or not skill_level:
            continue

        key = (sport, skill_level)

        if key in has_duplicate:
            continue

        # create unique key
        has_duplicate.add(key)

        cursor.execute("""
            INSERT INTO user_detail (user_id, sport, skill_level)
            VALUES (%s, %s, %s)
        """, (
            user_id,
            sport,
            skill_level
        ))

    mysql.connection.commit()

    cursor.close()

    return jsonify({
        "message": "Profile updated successfully"
    })
