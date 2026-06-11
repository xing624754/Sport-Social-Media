from flask import Blueprint, request, session
from extensions import query_db, execute_db, socketIO
from posting import delete_user_post


review_bp = Blueprint("post_review", __name__)

@review_bp.route("/review-report", methods = ["GET"])
def get_all_reports():
    data = query_db(
        """
        SELECT 
            MIN(r.report_id) as report_id,
            r.type,
            r.post_id,
            r.account_id,
            GROUP_CONCAT(r.description SEPARATOR ' | ') as description,
            MIN(r.user_id) as user_id,
            r.admin_id,
            MAX(r.created_at) as created_at
        FROM report r
        WHERE r.status = 'Pending' AND r.type != 'Account'
        GROUP BY r.type, r.passed_ai_check, COALESCE(r.post_id, 0), COALESCE(r.account_id, 0)
        ORDER BY created_at DESC
        """
    )

    if data == "error":
        return {"error": "Internal server error"}, 500
    else:
        # Convert datetime objects to string format for JSON serialization
        for report in data:
            if report.get("created_at"):
                report["created_at"] = str(report["created_at"])
        return {"data": data}

@review_bp.route("/review-report/<int:report_id>", methods = ["GET", "POST", "PUT"])
def update_report_status(report_id):
    if request.method == "GET":
        report = query_db(
            """
                select * from report where report_id = %s
            """,
            (report_id,)
        )

        if not report or report == "error":
            return {"error": "Report not found"}, 404

        report_data = report[0]
        report_data["created_at"] = str(report_data["created_at"])

        post_id = report_data.get("post_id")
        account_id = report_data.get("account_id")
        post_data = None

        if post_id:
            post_details = query_db(
                """
                select p.post_id, p.title, p.description, p.timestamp, u.username
                from post p
                join user u on p.user_id = u.user_id
                where p.post_id = %s
                """,
                (post_id,)
            )
            if post_details and post_details != "error":
                media = query_db("select media_url from post_media where post_id = %s", (post_id,))
                post_data = {
                    "post_id": post_details[0]["post_id"],
                    "title": post_details[0]["title"],
                    "description": post_details[0]["description"],
                    "timestamp": str(post_details[0]["timestamp"]),
                    "username": post_details[0]["username"],
                    "media_urls": [m["media_url"] for m in media] if media and media != "error" else []
                }

        # Fetch other pending reports for the same item (post or account)
        other_reports = []
        if post_id:
            other_reports_data = query_db(
                """
                select report_id, user_id, description, created_at
                from report
                where post_id = %s and report_id != %s and status = 'Pending'
                """,
                (post_id, report_id)
            )
        elif account_id:
            other_reports_data = query_db(
                """
                select report_id, user_id, description, created_at
                from report
                where account_id = %s and report_id != %s and status = 'Pending'
                """,
                (account_id, report_id)
            )
        else:
            other_reports_data = []

        if other_reports_data and other_reports_data != "error":
            for r in other_reports_data:
                r["created_at"] = str(r["created_at"])
            other_reports = other_reports_data

        return {"data": {"report": report_data, "post": post_data, "other_reports": other_reports}}, 200

    if request.method in ["POST", "PUT"]:
        data = request.json or {}
        status = data.get("status")
        
        if not status or status not in ["Approved", "Rejected"]:
            return {"error": "Invalid or missing status"}, 400

        # Retrieve the report to check for associated post_id or account_id
        report = query_db("select type, post_id, account_id from report where report_id = %s", (report_id,))
        if not report or report == "error":
            return {"error": "Report not found"}, 404
        
        rep_type = report[0].get("type")
        post_id = report[0].get("post_id")
        account_id = report[0].get("account_id")
        
        # Record admin's user ID from session
        admin_id = session.get("user_id")

        if status == "Approved":
            # If report is approved and has an associated post, delete/hide the post
            if rep_type == "Post" and post_id:
                execute_db("update post set is_deleted = 1 where post_id = %s", (post_id,))
                # Decrement hashtag use counts and clean up links
                hashtags = query_db("select hashtag_id from post_hashtag where post_id = %s", (post_id,))
                if hashtags and hashtags != "error":
                    for h in hashtags:
                        execute_db("update hashtag set num_of_use = num_of_use - 1 where hashtag_id = %s", (h["hashtag_id"],))
                execute_db("delete from post_hashtag where post_id = %s", (post_id,))

            # Auto-approve ALL pending reports for this same item
            if rep_type == "Post" and post_id:
                execute_db(
                    """
                        update report
                        set status = 'Approved', admin_id = %s 
                        where post_id = %s and status = 'Pending'
                    """, 
                    (admin_id, post_id)
                )
            elif rep_type == "Account" and account_id:
                execute_db(
                    """
                        update report
                        set status = 'Approved', admin_id = %s 
                        where account_id = %s and status = 'Pending'
                    """, 
                    (admin_id, account_id)
                )
            else:
                execute_db(
                    """
                        update report
                        set status = 'Approved', admin_id = %s where report_id = %s
                    """,
                    (admin_id, report_id)
                )
        elif status == "Rejected":
            # Auto-reject ALL pending reports for this same item
            if rep_type == "Post" and post_id:
                execute_db(
                    """
                        update report
                        set status = 'Rejected', admin_id = %s 
                        where post_id = %s and status = 'Pending'
                    """, 
                    (admin_id, post_id)
                )
            elif rep_type == "Account" and account_id:
                execute_db(
                    """
                        update report
                        set status = 'Rejected', admin_id = %s 
                        where account_id = %s and status = 'Pending'
                    """, 
                    (admin_id, account_id)
                )
            else:
                execute_db(
                    """
                        update report
                        set status = 'Rejected', admin_id = %s where report_id = %s
                    """,
                    (admin_id, report_id)
                )

        socketIO.emit("reports_updated")
        socketIO.emit("users_updated")
        return {"message": f"Report successfully {status.lower()}"}, 200

