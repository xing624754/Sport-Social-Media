import os
from flask import Blueprint, request, session, current_app
from extensions import query_db, execute_db, socketIO

announcement_bp = Blueprint("announcement", __name__)


# Returns an error response if NOT allowed, or None if the user may continue.
def require_admin():
    if not session.get("user_id"):
        return {"error": "You must login"}, 401
    if session.get("role") not in ("Admin", "Superadmin"):
        return {"error": "Only admins can manage announcements"}, 403
    return None


# POST - create an announcement and send it to every user.
@announcement_bp.route("/announcement", methods=["POST"])
def create_announcement():
    ## Make sure the person is an admin.
    error = require_admin()
    if error:
        return error

    # Title/content now come as form fields (multipart, so an image can ride along).
    title = (request.form.get("title") or "").strip()
    content = (request.form.get("content") or "").strip()

    # Both fields are required. Title must fit the 50-char column.
    if not title or not content:
        return {"error": "Title and content are required"}, 400
    if len(title) > 50:
        return {"error": "Title must be 50 characters or fewer"}, 400
    if len(content) > 2000:
        return {"error": "Content must be 2000 characters or fewer"}, 400

    # Save the announcement first; file_url is filled in after we know the id.
    # is_deleted = 0 means "not deleted".
    announcement_id = execute_db(
        """
        INSERT INTO announcement (title, content, file_url, is_deleted)
        VALUES (%s, %s, NULL, 0)
        """,
        (title, content)
    )
    if announcement_id == "error":
        return {"error": "Could not create announcement"}, 500

    # Optional: one image for the announcement -> save it and set file_url.
    image = request.files.get("file")
    if image and image.filename != "":
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        ann_folder = os.path.join(upload_folder, "announcements")
        os.makedirs(ann_folder, exist_ok=True)
        ext = os.path.splitext(image.filename)[1]
        filename = f"{announcement_id}{ext}"
        image.save(os.path.join(ann_folder, filename))
        execute_db(
            "UPDATE announcement SET file_url = %s WHERE announcement_id = %s",
            (f"/uploads/announcements/{filename}", announcement_id)
        )

    # Fan-out: give every active user one Unread notification that LINKS to this
    # announcement. notification_content stays NULL on purpose 
    # lives in the linked announcement table (read back via announcement_id).
    result = execute_db(
        """
        INSERT INTO notification (user_id, announcement_id, notification_content, status, type)
        SELECT user_id, %s, NULL, 'Unread', 'Announcement'
        FROM user
        WHERE role = 'User' AND status = 'Active'
        """,
        (announcement_id,)
    )
    if result == "error":
        return {"error": "Announcement saved but failed to notify users"}, 500

    socketIO.emit("announcements_updated")
    return {"message": "Announcement sent!"}


# GET - list all announcements that are not deleted (newest first).
@announcement_bp.route("/announcements", methods=["GET"])
def get_announcements():
    error = require_admin()
    if error:
        return error

    announcements = query_db(
        """
        SELECT announcement_id, title, content, file_url
        FROM announcement
        WHERE is_deleted = 0
        ORDER BY announcement_id DESC
        """,
        ()
    )
    if announcements == "error":
        return {"error": "Could not load announcements"}, 500

    return {"data": announcements or []}


# DELETE - soft-delete an announcement and remove it from users' notification bells.
@announcement_bp.route("/announcement/<int:announcement_id>", methods=["DELETE"])
def delete_announcement(announcement_id):
    error = require_admin()
    if error:
        return error

    # this is a soft delete
    # mark the announcement as deleted but keep it in the database for record-keeping.
    result = execute_db(
        "UPDATE announcement SET is_deleted = 1 WHERE announcement_id = %s",
        (announcement_id,)
    )
    if result == "error":
        return {"error": "Could not delete announcement"}, 500

    # remove the matching notifications so users stop seeing it in the bell.
    execute_db(
        "DELETE FROM notification WHERE announcement_id = %s",
        (announcement_id,)
    )

    socketIO.emit("announcements_updated")
    return {"message": "Announcement deleted"}
