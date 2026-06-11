from flask import Blueprint, request, jsonify, send_from_directory, current_app
from extensions import mysql
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash
import os
from auth import is_password_valid

admin_profile_bp = Blueprint("admin_profile", __name__)

UPLOAD_FOLDER = "uploads/profile_pics"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# SERVE UPLOADED IMAGES

@admin_profile_bp.route("/uploads/profile_pics/<filename>")
def uploaded_file(filename):
    return send_from_directory("uploads/profile_pics", filename)

# GET ADMIN PROFILE
@admin_profile_bp.route("/admin/profile/<int:user_id>", methods=["GET"])
def get_admin_profile(user_id):

    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT
            user_id,
            role,
            username,
            status,
            gender,
            birthdate,
            email,
            profile_pic,
            freeze_until
        FROM user
        WHERE user_id = %s
    """, (user_id,))

    user = cursor.fetchone()

    cursor.close()

    if not user:
        return jsonify({
            "message": "User not found"
        }), 404
    

    profile_pic = user[7]

    if not profile_pic:
        profile_pic = "/uploads/profile_pics/user.png"

    elif not profile_pic.startswith("/uploads/profile_pics/"):
        profile_pic = f"/uploads/profile_pics/{profile_pic}"

    return jsonify({
        "user_id": user[0],
        "role": user[1],
        "username": user[2],
        "status": user[3],
        "gender": user[4],
        "birthdate": user[5].strftime("%B %d, %Y") if user[5] else "",
        "email": user[6],
        "profile_pic": profile_pic,
        "freeze_until": user[8]
    })



# UPDATE ADMIN PROFILE
@admin_profile_bp.route("/admin/profile/<int:user_id>", methods=["PUT"])
def update_admin_profile(user_id):

    data = request.json

    cursor = mysql.connection.cursor()

    email = data.get("email")
    if email:
        cursor.execute("SELECT user_id FROM user WHERE email = %s AND user_id != %s", (email, user_id))
        duplicate = cursor.fetchone()
        if duplicate:
            cursor.close()
            return jsonify({"message": "Email is already taken by another user."}), 400

    password = data.get("password")
    confirm_password = data.get("confirmPassword")

    # CHANGE PASSWORD ONLY IF PROVIDED
    if password:
        if password != confirm_password:
            cursor.close()
            return jsonify({"message": "Passwords do not match"}), 400

        valid_password, error_msg = is_password_valid(password)
        if not valid_password:
            cursor.close()
            return jsonify({"message": error_msg}), 400

        hashed_password = generate_password_hash(
            password
        )

        cursor.execute("""
            UPDATE user
            SET
                password = %s,
                email = %s,
                profile_pic = %s
            WHERE user_id = %s
        """, (
            hashed_password,
            data["email"],
            data["profile_pic"],
            user_id
        ))

    else:

        cursor.execute("""
            UPDATE user
            SET
                email = %s,
                profile_pic = %s
            WHERE user_id = %s
        """, (
            data["email"],
            data["profile_pic"],
            user_id
        ))

    mysql.connection.commit()

    cursor.close()

    return jsonify({
        "message": "Profile updated successfully"
    })


# UPLOAD PROFILE PICTURE

@admin_profile_bp.route("/admin/upload-profile-picture", methods=["POST"])
def upload_profile_picture():

    if "profile_picture" not in request.files:
        return jsonify({"message": "No image uploaded"}), 400

    file = request.files["profile_picture"]

    user_id = request.form.get("user_id")

    if not user_id:
        return jsonify({"message": "Missing user_id"}), 400

    cursor = mysql.connection.cursor()

    # 🔥 1. GET OLD PROFILE PIC
    cursor.execute("""
        SELECT profile_pic
        FROM user
        WHERE user_id = %s
    """, (user_id,))

    old_pic = cursor.fetchone()
    old_pic_path = None

    if old_pic and old_pic[0]:
        # convert URL → filesystem path
        old_filename = os.path.basename(old_pic[0])
        old_pic_path = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            "profile_pics",
            old_filename
        )

    # 🔥 2. PREP NEW FILE
    ext = os.path.splitext(file.filename)[1]
    filename = f"{user_id}{ext}"

    upload_folder = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        "profile_pics"
    )
    os.makedirs(upload_folder, exist_ok=True)

    filepath = os.path.join(upload_folder, filename)

    # 🔥 3. DELETE OLD FILE (if exists and not default)
    if old_pic_path and os.path.exists(old_pic_path) and "user.png" not in old_pic_path:
        try:
            os.remove(old_pic_path)
        except Exception as e:
            print("Failed to delete old image:", e)

    # 🔥 4. SAVE NEW FILE
    file.save(filepath)

    image_url = f"/uploads/profile_pics/{filename}"

    # 🔥 5. UPDATE DATABASE
    cursor.execute("""
        UPDATE user
        SET profile_pic = %s
        WHERE user_id = %s
    """, (image_url, user_id))

    mysql.connection.commit()
    cursor.close()

    return jsonify({
        "image_url": image_url
    })