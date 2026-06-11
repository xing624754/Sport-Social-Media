from flask import Blueprint, session, request
from extensions import query_db, execute_db, socketIO

report_bp = Blueprint("report", __name__)


# POST /api/report/account/<id>
# save as pending in the report table
# user cannot report the same account twice while it's still pending
@report_bp.route("/report/account/<int:reported_user_id>", methods=["POST"])
def report_account(reported_user_id):

    # check who is reporting and must be logged in
    reporter_id = session.get("user_id")
    if not reporter_id:
        return {"error": "You must login"}, 401

    #user cannot report yourself.
    if reporter_id == reported_user_id:
        return {"error": "You cannot report yourself"}, 400

    #Get the reason from the request. It cannot be empty.
    data = request.get_json(silent=True) or {}
    reason = (data.get("description") or "").strip()
    if not reason:
        return {"error": "Please give a reason for the report"}, 400

    # Don't let the same person report the same user twice while it's still pending.
    already_reported = query_db(
        "SELECT report_id FROM report WHERE user_id = %s AND account_id = %s AND status = 'Pending'",
        (reporter_id, reported_user_id)
    )
    if already_reported == "error":
        return {"error": "Something went wrong"}, 500
    if already_reported:
        return {"error": "You already reported this user"}, 400

    # attach any admin as a placeholder (replaced by the real
    # reviewer when an admin approves/rejects it in post_review).
    admin = query_db(
        "SELECT user_id FROM `user` WHERE role IN ('Admin', 'Superadmin') LIMIT 1",
        one=True
    )
    placeholder_admin_id = admin["user_id"] if admin else reporter_id

    # Save the report into the report table.
    result = execute_db(
        """
        INSERT INTO report (user_id, account_id, type, description, passed_ai_check, status, admin_id)
        VALUES (%s, %s, 'Account', %s, 0, 'Pending', %s)
        """,
        (reporter_id, reported_user_id, reason, placeholder_admin_id)
    )
    if result == "error":
        return {"error": "Could not submit report"}, 500

    socketIO.emit("reports_updated")
    return {"message": "Report submitted"}, 200


# POST /api/report/post/<id>
# A user reports a post. Saved as a 'Post' report with status Pending.
@report_bp.route("/report/post/<int:post_id>", methods=["POST"])
def report_post(post_id):
    reporter_id = session.get("user_id")
    if not reporter_id:
        return {"error": "You must login"}, 401

    # Get the reason. It cannot be empty.
    data = request.get_json(silent=True) or {}
    reason = (data.get("description") or "").strip()
    if not reason:
        return {"error": "Please give a reason for the report"}, 400

    # Find the post and who owns it.
    post = query_db(
        "SELECT user_id FROM post WHERE post_id = %s AND is_deleted = 0",
        (post_id,)
    )
    if post == "error":
        return {"error": "Something went wrong"}, 500
    if not post:
        return {"error": "Post not found"}, 404
    post_owner_id = post[0]["user_id"]

    # Cannot report your own post.
    if post_owner_id == reporter_id:
        return {"error": "You cannot report your own post"}, 400

    # Don't let the same person report the same post twice while it's still pending.
    already_reported = query_db(
        "SELECT report_id FROM report WHERE user_id = %s AND post_id = %s AND status = 'Pending'",
        (reporter_id, post_id)
    )
    if already_reported == "error":
        return {"error": "Something went wrong"}, 500
    if already_reported:
        return {"error": "You already reported this post"}, 400

    # Attach any admin as a placeholder --- it won't be the real reviewer but
    # will be replaced by the real reviewer when an admin approves/rejects it in post_review.
    admin = query_db(
        "SELECT user_id FROM `user` WHERE role IN ('Admin', 'Superadmin') LIMIT 1",
        one=True
    )
    placeholder_admin_id = admin["user_id"] if admin else reporter_id

    # Save the post report.
    result = execute_db(
        """
        INSERT INTO report (user_id, account_id, post_id, type, description, passed_ai_check, status, admin_id)
        VALUES (%s, %s, %s, 'Post', %s, 0, 'Pending', %s)
        """,
        (reporter_id, post_owner_id, post_id, reason, placeholder_admin_id)
    )
    if result == "error":
        return {"error": "Could not submit report"}, 500

    socketIO.emit("reports_updated")
    return {"message": "Report submitted"}, 200
