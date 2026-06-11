from flask import Blueprint, request, session 
from extensions import query_db, execute_db, socketIO
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta, timezone, date

usermanagement_bp = Blueprint(
    "usermanagement",
    __name__
)

#role check 
def has_access(allowed_roles):
    role = session.get("role")

    return role in allowed_roles

#check if user is frozen     
def is_frozen(user_id):

    user = query_db("""
        SELECT
            status,
            freeze_until
        FROM user
        WHERE user_id=%s
    """, (user_id,))

    if not user or user == "error":
        return False

    user = user[0]

    if (
        user["status"] == "Frozen"
        and
        user["freeze_until"]
    ):
        freeze_until = user["freeze_until"]
        parsed_freeze = None
        if isinstance(freeze_until, str):
            try:
                if " " in freeze_until:
                    parsed_freeze = datetime.strptime(freeze_until, "%Y-%m-%d %H:%M:%S").date()
                else:
                    parsed_freeze = datetime.strptime(freeze_until, "%Y-%m-%d").date()
            except Exception:
                pass
        elif isinstance(freeze_until, datetime):
            parsed_freeze = freeze_until.date()
        elif isinstance(freeze_until, date):
            parsed_freeze = freeze_until

        if parsed_freeze:
            today = datetime.now(timezone.utc).date()
            if parsed_freeze > today:
                return True

        # AUTO UNFREEZE
        execute_db("""
            UPDATE user
            SET
                status='Active',
                freeze_until=NULL
            WHERE user_id=%s
        """, (user_id,))

    return False

#get current user role
@usermanagement_bp.route(
    "/user-management/role",
    methods = ["GET"]
)
def get_current_role():
    if "user_id" not in session:
        return {
            "error": "Unauthorized Access"
        }, 401
    return {
        "role": session.get("role")
    }, 200


#Admin Management (superadmin can access only) GET ADMIN
@usermanagement_bp.route(
    "/admins",
    methods=["GET"]
)
def get_admins():

    if not has_access(["Superadmin"]):
        return {
            "error":"Access Denied"
        }, 403
    
    admins = query_db("""
        SELECT 
            user_id,
            username,
            status,
            gender,
            birthdate,
            email,
            profile_pic,
            freeze_until,
            join_at
        FROM user
        WHERE role='Admin'
        AND status != 'Deleted'
        ORDER BY join_at DESC
    """ )

    if admins == "error":
        return {
            "error":"Something went wrong"
        }, 400
    
    return {
        "admins" : admins
    }, 200

#register new admin
@usermanagement_bp.route(
    "/admins",
    methods=["POST"]
)
def create_admin():

    if not has_access(["Superadmin"]):
        return {
            "error":"Access denied"
        }, 403

    data = request.get_json()

    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    gender = data.get("gender")
    birthdate = data.get("birthdate")

    if not username or not password or not email:
        return {
            "error":"Missing fields"
        }, 400

    existing_user = query_db("""
        SELECT user_id
        FROM user
        WHERE username=%s
        OR email=%s
    """, (
        username,
        email
    ))

    if existing_user:
        return {
            "error":"Username or email exists"
        }, 400

    hashed_password = generate_password_hash(password)

    result = execute_db("""
        INSERT INTO user
        (
            role,
            username,
            password,
            status,
            gender,
            birthdate,
            email,
            profile_pic
        )
        VALUES
        (
            'Admin',
            %s,
            %s,
            'Active',
            %s,
            %s,
            %s,
            '/uploads/profile_pics/user.png'
        )
    """, (
        username,
        hashed_password,
        gender,
        birthdate,
        email
    ))

    if result == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "message":"Admin created successfully"
    }, 201

#update admin


#delete admin
@usermanagement_bp.route(
    "/admins/<int:user_id>",
    methods=["DELETE"]
)
def delete_admin(user_id):

    if not has_access(["Superadmin"]):
        return {
            "error":"Access denied"
        }, 403

    result = execute_db("""
        UPDATE user
        SET status='Deleted'
        WHERE user_id=%s
        AND role='Admin'
    """, (user_id,))

    if result == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "message":"Admin removed"
    }, 200


#Report Management (admin & superadmin) 
#get post report summary table 
@usermanagement_bp.route(
    "/report-summary",
    methods=["GET"]
)
def get_report_summary():

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403


    reports = query_db("""
        SELECT
            u.user_id,
            u.username,
            u.profile_pic,
            u.status,
            u.freeze_until,
            COUNT(r.report_id) as total_reports
        FROM report r

        JOIN user u
        ON r.account_id = u.user_id

        WHERE r.status='Approved'
        AND r.type='Post'

        GROUP BY r.account_id

        HAVING total_reports >= 3

        ORDER BY total_reports DESC
    """)

    if reports == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "reports": reports
    }, 200

#get account report summary table
@usermanagement_bp.route(
    "/account-reports",
    methods=["GET"]
)
def get_account_reports():

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403

    reports = query_db("""
        SELECT
            r.report_id,
            r.user_id,
            r.account_id,
            r.description,
            r.status,
            r.created_at,

            reporter.username as reporter_name,
            reported.username as reported_name

        FROM report r

        JOIN user reporter
        ON r.user_id = reporter.user_id

        JOIN user reported
        ON r.account_id = reported.user_id

        WHERE r.type='Account'

        ORDER BY r.created_at DESC
    """)

    if reports == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "reports": reports
    }, 200

#review account report 
@usermanagement_bp.route(
    "/review-report/<int:report_id>",
    methods=["PUT"]
)
def review_report(report_id):

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403

    data = request.get_json()

    status = data.get("status")

    if status not in [
        "Approved",
        "Rejected"
    ]:
        return {
            "error":"Invalid status"
        }, 400

    existing_report = query_db("""
        SELECT status
        FROM report
        WHERE report_id=%s
    """, (report_id,))

    if not existing_report:
        return {
            "error":"Report not found"
        }, 404
    
    current_status = existing_report[0]["status"]

    if current_status != "Pending":
        return {
            "error":"Report already reviewed"
        }, 400

    result = execute_db("""
        UPDATE report
        SET status=%s
        WHERE report_id=%s
    """, (
        status,
        report_id
    ))

    if result == "error":
        return {
            "error":"Something went wrong"
        }, 400
    
    # FREEZE ACCOUNT
    if status == "Approved":

        report_data = query_db("""
            SELECT account_id
            FROM report
            WHERE report_id=%s
        """, (report_id,))

        if report_data:

            account_id = report_data[0]["account_id"]

            approved_reports = query_db("""
                SELECT COUNT(*) as total
                FROM report
                WHERE account_id=%s
                AND type='Account'
                AND status='Approved'
            """, (account_id,))

            total = approved_reports[0]["total"]

            freeze_days = None

            # ACCOUNT REPORT PENALTY SYSTEM
            if total == 1:
                freeze_days = 14

            elif total == 2:
                freeze_days = 30

            elif total == 5:
                freeze_days = 365

            # ONLY FREEZE ON MILESTONE
            if freeze_days:

                freeze_until = (
                    datetime.now(timezone.utc)
                    + timedelta(days=freeze_days)
                )

                execute_db("""
                    UPDATE user
                    SET
                        status='Frozen',
                        freeze_until=%s
                    WHERE user_id=%s
                """, (
                    freeze_until,
                    account_id
                ))

    socketIO.emit("reports_updated")
    return {
        "message":"Report updated"
    }, 200

# get post report details
@usermanagement_bp.route(
    "/post-report-details/<int:user_id>",
    methods=["GET"]
)
def get_post_report_details(user_id):

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403

    reports = query_db("""
        SELECT
            MAX(r.report_id) as report_id,
            MAX(r.created_at) as report_time,

            -- Creates a string like: "Coreen|||bad word&&&gdragon|||harassment caption"
            GROUP_CONCAT(
                CONCAT(IFNULL(reporter.username, 'AI-Moderator'), '|||', r.description)
                SEPARATOR '&&&'
            ) as report_meta,

            p.post_id,
            IFNULL(p.title, 'No Title') as title,
            IFNULL(p.description, 'No Description') as post_description,
            p.timestamp as post_time,
            p.type as post_type,

            GROUP_CONCAT(
                DISTINCT pm.media_url
                SEPARATOR '||'
            ) as media_urls,

            IFNULL(u.username, 'Unknown User') as username

        FROM report r

        LEFT JOIN post p
        ON r.post_id = p.post_id

        LEFT JOIN post_media pm
        ON pm.post_id = p.post_id

        LEFT JOIN user u
        ON p.user_id = u.user_id

        LEFT JOIN user reporter
        ON r.user_id = reporter.user_id

        WHERE r.account_id=%s
        AND r.type='Post'
        AND r.status='Approved'

        GROUP BY p.post_id

        ORDER BY report_time DESC
    """, (user_id,))

    if reports == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "reports": reports
    }, 200

# get account report details
@usermanagement_bp.route(
    "/account-report-details/<int:report_id>",
    methods=["GET"]
)
def get_account_report_details(report_id):

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403

    report_data = query_db("""
        SELECT
            r.report_id,
            r.description,
            r.status,
            r.created_at,
            reporter.username as reporter_name,
            reported.username as reported_name
        FROM report r
        JOIN user reporter ON r.user_id = reporter.user_id
        JOIN user reported ON r.account_id = reported.user_id
        WHERE r.report_id = %s
        AND r.type = 'Account'
    """, (report_id,))

    if report_data == "error":
        return {
            "error":"Something went wrong querying the database"
        }, 400

    if not report_data:
        return {
            "error":"Account report not found"
        }, 404

    # Return a single report object matching what your frontend maps:
    # response.data.report
    return {
        "report": report_data[0]
    }, 200

@usermanagement_bp.route(
    "/freeze-account/<int:user_id>",
    methods=["PUT"]
)
def freeze_account(user_id):

    if not has_access([
        "Admin",
        "Superadmin"
    ]):
        return {
            "error":"Access denied"
        }, 403
    
    # GET CURRENT USER STATUS AND FREEZE DATE
    user_status_data = query_db("""
        SELECT status, freeze_until
        FROM user
        WHERE user_id=%s
    """, (user_id,))

    if not user_status_data or user_status_data == "error":
        return {
            "error":"User not found"
        }, 404

    user_info = user_status_data[0]

    approved_reports = query_db("""
        SELECT COUNT(*) as total
        FROM report
        WHERE account_id=%s
        AND status='Approved'
        AND type='Post'
    """, (user_id,))

    if approved_reports == "error":
        return {
            "error":"Something went wrong"
        }, 400

    total = approved_reports[0]["total"]

    # POST REPORT PENALTY SYSTEM
    freeze_days = 0
    if 3 <= total <= 4:
        freeze_days = 14
    elif 5 <= total <= 8:
        freeze_days = 30
    elif 9 <= total <= 10:
        freeze_days = 365
    elif total > 10:
        result = execute_db("""
            UPDATE user
            SET
                status='Deleted',
                freeze_until=NULL
            WHERE user_id=%s
        """, (user_id,))

        if result == "error":
            return {
                "error":"Something went wrong"
            }, 400

        return {
            "message":"Account deleted successfully due to excessive guidelines violations",
            "action": "Deleted"
        }, 200
    else:
        return {
            "error":"No penalty threshold reached"
        }, 400

    # Calculate base date (today, or existing freeze_until if in the future)
    today = datetime.now(timezone.utc).date()
    base_date = today

    if (
        user_info
        and
        user_info.get("status") == "Frozen"
        and
        user_info.get("freeze_until")
    ):
        current_freeze = user_info["freeze_until"]
        parsed_freeze = None
        if isinstance(current_freeze, str):
            try:
                if " " in current_freeze:
                    parsed_freeze = datetime.strptime(current_freeze, "%Y-%m-%d %H:%M:%S").date()
                else:
                    parsed_freeze = datetime.strptime(current_freeze, "%Y-%m-%d").date()
            except Exception:
                pass
        elif isinstance(current_freeze, datetime):
            parsed_freeze = current_freeze.date()
        elif isinstance(current_freeze, date):
            parsed_freeze = current_freeze

        if parsed_freeze and parsed_freeze > today:
            base_date = parsed_freeze

    new_freeze_until = base_date + timedelta(days=freeze_days)
    new_freeze_until_str = new_freeze_until.strftime("%Y-%m-%d")

    result = execute_db("""
        UPDATE user
        SET
            status='Frozen',
            freeze_until=%s
        WHERE user_id=%s
    """, (
        new_freeze_until_str,
        user_id
    ))

    if result == "error":
        return {
            "error":"Something went wrong"
        }, 400

    return {
        "message":"Account frozen successfully",
        "freeze_until": new_freeze_until_str,
        "freeze_days": freeze_days,
        "action": "Frozen"
    }, 200