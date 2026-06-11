from flask import Blueprint, request, session
from extensions import query_db, execute_db, calculate_age, socketIO
from datetime import date, datetime, timedelta

activity_hosting_bp = Blueprint("activity_hosting", __name__)

@activity_hosting_bp.route("/activities", methods=["GET"])
def get_activities():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    tab = request.args.get("tab", "all").strip().lower()
    
    local_now = datetime.now()
    current_date = local_now.strftime("%Y-%m-%d")
    current_time = local_now.strftime("%H:%M:%S")
    
    # Find pending players for expired activities to notify them
    expired_pending = query_db(
        """
        SELECT ap.user_id, a.title, a.activity_id
        FROM activity_player ap
        JOIN activity a ON ap.activity_id = a.activity_id
        WHERE ap.status = 'Pending' AND a.is_deleted = 0
        AND (a.date < %s OR (a.date = %s AND a.start_time <= %s))
        """,
        (current_date, current_date, current_time)
    )
    
    # Auto-reject pending players for expired activities
    execute_db(
        """
        UPDATE activity_player ap
        JOIN activity a ON ap.activity_id = a.activity_id
        SET ap.status = 'Rejected'
        WHERE ap.status = 'Pending' AND a.is_deleted = 0
        AND (a.date < %s OR (a.date = %s AND a.start_time <= %s))
        """,
        (current_date, current_date, current_time)
    )
    
    if expired_pending and expired_pending != "error":
        for player in expired_pending:
            p_id = player["user_id"]
            act_title = player["title"]
            act_id = player["activity_id"]
            msg = f"Your request for '{act_title}' was rejected (expired)."[:50]
            execute_db(
                """
                INSERT INTO notification (user_id, type, notification_content, status)
                VALUES (%s, 'Notification', %s, 'Unread')
                """,
                (p_id, msg)
            )
            socketIO.emit(
                "join_request_notification",
                {"owner_id": p_id, "message": msg, "activity_id": act_id},
                room=f"user_{p_id}"
            )
    
    if tab == "my":
        query = """
            SELECT a.*, u.username as creator_username, u.profile_pic as creator_profile_pic,
                   sc.name as sport_name, sl.name as skill_level_name,
                   ag.age_from, ag.to_age,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Accepted') as joined_count,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Pending') as pending_count,
                   IF(a.date < %s OR (a.date = %s AND a.start_time <= %s), 'Expired', 'Owner') as my_status
            FROM activity a
            JOIN user u ON a.user_id = u.user_id
            LEFT JOIN age_group ag ON a.age_group = ag.group_id
            JOIN sport_category sc ON a.sport = sc.category_id
            LEFT JOIN skill_level sl ON a.skill_level = sl.skill_level_id
            WHERE a.user_id = %s AND a.is_deleted = 0
            ORDER BY a.date DESC, a.start_time DESC
        """
        rows = query_db(query, (current_date, current_date, current_time, user_id))
    elif tab == "joined":
        query = """
            SELECT a.*, u.username as creator_username, u.profile_pic as creator_profile_pic,
                   sc.name as sport_name, sl.name as skill_level_name,
                   ag.age_from, ag.to_age,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Accepted') as joined_count,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Pending') as pending_count,
                   ap_self.status as my_status
            FROM activity a
            JOIN user u ON a.user_id = u.user_id
            LEFT JOIN age_group ag ON a.age_group = ag.group_id
            JOIN sport_category sc ON a.sport = sc.category_id
            LEFT JOIN skill_level sl ON a.skill_level = sl.skill_level_id
            JOIN activity_player ap_self ON a.activity_id = ap_self.activity_id
            WHERE ap_self.user_id = %s AND a.is_deleted = 0
            ORDER BY a.date DESC, a.start_time DESC
        """
        rows = query_db(query, (user_id,))
    else:  # tab == "all"
        query = """
            SELECT a.*, u.username as creator_username, u.profile_pic as creator_profile_pic,
                   sc.name as sport_name, sl.name as skill_level_name,
                   ag.age_from, ag.to_age,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Accepted') as joined_count,
                   (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Pending') as pending_count,
                   (SELECT status FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.user_id = %s) as my_status
            FROM activity a
            JOIN user u ON a.user_id = u.user_id
            LEFT JOIN age_group ag ON a.age_group = ag.group_id
            JOIN sport_category sc ON a.sport = sc.category_id
            LEFT JOIN skill_level sl ON a.skill_level = sl.skill_level_id
            WHERE a.is_deleted = 0 AND (a.total_player_needed IS NULL OR (
                SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Accepted'
            ) < a.total_player_needed)
            AND (a.date > %s OR (a.date = %s AND a.start_time > %s))
            ORDER BY a.date ASC, a.start_time ASC
        """
        rows = query_db(query, (user_id, current_date, current_date, current_time))
    
    if rows == "error":
        return {"error": "Failed to fetch activities"}, 500
    
    for row in rows:
        if isinstance(row["date"], (date, datetime)):
            row["date"] = row["date"].strftime("%Y-%m-%d")
        
        for time_key in ["start_time", "end_time"]:
            val = row[time_key]
            if isinstance(val, timedelta):
                total_seconds = int(val.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                row[time_key] = f"{hours:02d}:{minutes:02d}"
            elif hasattr(val, "strftime"):
                row[time_key] = val.strftime("%H:%M")
            elif val is None:
                row[time_key] = ""
            else:
                row[time_key] = str(val)
                
    return {"activities": rows}, 200

@activity_hosting_bp.route("/activities", methods=["POST"])
def create_activity():
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    data = request.json or {}
    title = data.get("title", "").strip()
    age_group = data.get("age_group")
    sport = data.get("sport")
    skill_level = data.get("skill_level")
    description = data.get("description", "").strip()
    act_date = data.get("date")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    venue = data.get("venue", "").strip()
    total_player_needed = data.get("total_player_needed")
    
    if not (title and sport and description and act_date and start_time and end_time and venue):
        return {"error": "Please fill in all required fields"}, 400
    
    age_group_val = int(age_group) if age_group is not None and str(age_group).strip() != "" else None
    skill_level_val = int(skill_level) if skill_level is not None and str(skill_level).strip() != "" else None
    total_player_needed_val = int(total_player_needed) if total_player_needed is not None and str(total_player_needed).strip() != "" else None
    
    result = execute_db(
        """
        INSERT INTO activity (user_id, title, age_group, sport, skill_level, description, date, start_time, end_time, venue, total_player_needed, is_deleted)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
        """,
        (user_id, title, age_group_val, int(sport), skill_level_val, description, act_date, start_time, end_time, venue, total_player_needed_val)
    )
    
    if result == "error":
        return {"error": "Failed to create activity"}, 500
    
    socketIO.emit("activities_updated")
    return {"message": "Activity created successfully", "activity_id": result}, 201

@activity_hosting_bp.route("/activities/<int:activity_id>", methods=["GET"])
def get_activity_detail(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
        
    query = """
        SELECT a.*, u.username as creator_username, u.profile_pic as creator_profile_pic,
               sc.name as sport_name, sl.name as skill_level_name,
               ag.age_from, ag.to_age,
               (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Accepted') as joined_count,
               (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.status = 'Pending') as pending_count,
               IF(a.user_id = %s, 'Owner', (SELECT status FROM activity_player ap WHERE ap.activity_id = a.activity_id AND ap.user_id = %s)) as my_status
        FROM activity a
        JOIN user u ON a.user_id = u.user_id
        LEFT JOIN age_group ag ON a.age_group = ag.group_id
        JOIN sport_category sc ON a.sport = sc.category_id
        LEFT JOIN skill_level sl ON a.skill_level = sl.skill_level_id
        WHERE a.activity_id = %s AND a.is_deleted = 0
    """
    rows = query_db(query, (user_id, user_id, activity_id))
    if not rows or rows == "error":
        return {"error": "Activity not found"}, 404
        
    row = rows[0]
    if isinstance(row["date"], (date, datetime)):
        row["date"] = row["date"].strftime("%Y-%m-%d")
    
    for time_key in ["start_time", "end_time"]:
        val = row[time_key]
        if isinstance(val, timedelta):
            total_seconds = int(val.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            row[time_key] = f"{hours:02d}:{minutes:02d}"
        elif hasattr(val, "strftime"):
            row[time_key] = val.strftime("%H:%M")
        elif val is None:
            row[time_key] = ""
        else:
            row[time_key] = str(val)
            
    return {"activity": row}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>", methods=["PUT"])
def update_activity(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    activity = query_db(
        """
        SELECT user_id, is_deleted, total_player_needed, title, date, start_time,
               (SELECT COUNT(*) FROM activity_player ap WHERE ap.activity_id = %s AND ap.status = 'Accepted') as joined_count
        FROM activity WHERE activity_id = %s
        """, 
        (activity_id, activity_id)
    )
    if not activity or activity == "error":
        return {"error": "Activity not found"}, 404
    if activity[0]["is_deleted"] == 1:
        return {"error": "Activity has been deleted"}, 400
    if activity[0]["user_id"] != user_id:
        return {"error": "You are not authorized to edit this activity"}, 403

    # Check if the activity has expired
    local_now = datetime.now()
    current_date = local_now.strftime("%Y-%m-%d")
    current_time = local_now.strftime("%H:%M:%S")
    act_date = activity[0]["date"]
    act_time = activity[0]["start_time"]
    
    if isinstance(act_date, (date, datetime)):
        act_date_str = act_date.strftime("%Y-%m-%d")
    else:
        act_date_str = str(act_date)

    if isinstance(act_time, timedelta):
        total_seconds = int(act_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        act_time_str = f"{hours:02d}:{minutes:02d}:00"
    elif hasattr(act_time, "strftime"):
        act_time_str = act_time.strftime("%H:%M:%S")
    else:
        act_time_str = str(act_time)
        
    if act_date_str < current_date or (act_date_str == current_date and act_time_str <= current_time):
        return {"error": "This activity has expired and cannot be modified."}, 400
        
    data = request.json or {}
    title = data.get("title", "").strip()
    age_group = data.get("age_group")
    sport = data.get("sport")
    skill_level = data.get("skill_level")
    description = data.get("description", "").strip()
    act_date = data.get("date")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    venue = data.get("venue", "").strip()
    total_player_needed = data.get("total_player_needed")
    
    if not (title and sport and description and act_date and start_time and end_time and venue):
        return {"error": "Please fill in all required fields"}, 400
        
    age_group_val = int(age_group) if age_group is not None and str(age_group).strip() != "" else None
    skill_level_val = int(skill_level) if skill_level is not None and str(skill_level).strip() != "" else None
    total_player_needed_val = int(total_player_needed) if total_player_needed is not None and str(total_player_needed).strip() != "" else None
    
    old_needed = activity[0]["total_player_needed"]
    joined_count = activity[0]["joined_count"]
    
    # Enforce: Host can only increase total players needed, not decrease it.
    if total_player_needed_val is not None:
        if old_needed is not None and total_player_needed_val < old_needed:
            return {"error": "You can only increase the number of players needed, not decrease it."}, 400
        if total_player_needed_val < joined_count:
            return {"error": f"Total players needed cannot be less than the number of players who have already joined ({joined_count})."}, 400
            
    result = execute_db(
        """
        UPDATE activity
        SET title = %s, age_group = %s, sport = %s, skill_level = %s, description = %s, date = %s, start_time = %s, end_time = %s, venue = %s, total_player_needed = %s
        WHERE activity_id = %s
        """,
        (title, age_group_val, int(sport), skill_level_val, description, act_date, start_time, end_time, venue, total_player_needed_val, activity_id)
    )
    
    if result == "error":
        return {"error": "Failed to update activity"}, 500
        
    # Notify joined and pending participants
    joined_players = query_db("SELECT user_id FROM activity_player WHERE activity_id = %s AND status IN ('Accepted', 'Pending')", (activity_id,))
    if joined_players and joined_players != "error":
        for player in joined_players:
            p_id = player["user_id"]
            msg = f"The activity '{title}' has been updated."[:50]
            execute_db(
                """
                INSERT INTO notification (user_id, type, notification_content, status)
                VALUES (%s, 'Notification', %s, 'Unread')
                """,
                (p_id, msg)
            )
            socketIO.emit(
                "join_request_notification",
                {"owner_id": p_id, "message": msg, "activity_id": activity_id},
                room=f"user_{p_id}"
            )
        
    socketIO.emit("activities_updated")
    return {"message": "Activity updated successfully"}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>", methods=["DELETE"])
def delete_activity(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    activity = query_db("SELECT user_id, title FROM activity WHERE activity_id = %s", (activity_id,))
    if not activity or activity == "error":
        return {"error": "Activity not found"}, 404
    
    if activity[0]["user_id"] != user_id:
        return {"error": "You are not authorized to delete this activity"}, 403
    
    title = activity[0]["title"]
    
    # Get pending and joined players before deletion
    players = query_db("SELECT user_id FROM activity_player WHERE activity_id = %s AND status IN ('Accepted', 'Pending')", (activity_id,))
    
    result = execute_db("UPDATE activity SET is_deleted = 1 WHERE activity_id = %s", (activity_id,))
    if result == "error":
        return {"error": "Failed to delete activity"}, 500
        
    # Notify pending and joined players
    if players and players != "error":
        for player in players:
            p_id = player["user_id"]
            msg = f"The activity '{title}' has been cancelled."[:50]
            execute_db(
                """
                INSERT INTO notification (user_id, type, notification_content, status)
                VALUES (%s, 'Notification', %s, 'Unread')
                """,
                (p_id, msg)
            )
            socketIO.emit(
                "join_request_notification",
                {"owner_id": p_id, "message": msg, "activity_id": activity_id},
                room=f"user_{p_id}"
            )
    
    socketIO.emit("activities_updated")
    return {"message": "Activity deleted successfully"}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>/join", methods=["POST"])
def join_activity(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    activity = query_db("SELECT user_id, title, is_deleted FROM activity WHERE activity_id = %s", (activity_id,))
    if not activity or activity == "error":
        return {"error": "Activity not found"}, 404
    if activity[0]["is_deleted"] == 1:
        return {"error": "Activity has been deleted"}, 400
    
    if activity[0]["user_id"] == user_id:
        return {"error": "You cannot join your own activity"}, 400
    
    existing = query_db("SELECT player_id FROM activity_player WHERE activity_id = %s AND user_id = %s", (activity_id, user_id))
    if existing == "error":
        return {"error": "Failed to check join status"}, 500
    if existing:
        return {"error": "You have already requested to join or have joined this activity"}, 400
    
    result = execute_db(
        "INSERT INTO activity_player (user_id, activity_id, status) VALUES (%s, %s, 'Pending')",
        (user_id, activity_id)
    )
    if result == "error":
        return {"error": "Failed to join activity"}, 500
    
    # Send notification to the activity owner
    joiner = query_db("SELECT username FROM user WHERE user_id = %s", (user_id,))
    owner_id = activity[0]["user_id"]
    act_title = activity[0]["title"]
    if joiner and joiner != "error":
        joiner_name = joiner[0]["username"]
        message = f"{joiner_name} requested to join '{act_title}'"[:50]
        execute_db(
            """
            INSERT INTO notification (user_id, type, notification_content, status)
            VALUES (%s, 'Notification', %s, 'Unread')
            """,
            (owner_id, message)
        )
        socketIO.emit(
            "join_request_notification",
            {"owner_id": owner_id, "message": message, "activity_id": activity_id},
            room=f"user_{owner_id}"
        )
        
    socketIO.emit("activities_updated")
    return {"message": "Join request submitted. Waiting for owner approval."}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>/leave", methods=["POST"])
def leave_activity(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
        
    # Get details before deleting the record
    info = query_db(
        """
        SELECT a.user_id as owner_id, a.title, ap.status
        FROM activity a
        JOIN activity_player ap ON a.activity_id = ap.activity_id
        WHERE a.activity_id = %s AND ap.user_id = %s
        """,
        (activity_id, user_id)
    )
    
    result = execute_db(
        "DELETE FROM activity_player WHERE activity_id = %s AND user_id = %s",
        (activity_id, user_id)
    )
    if result == "error":
        return {"error": "Failed to cancel request or leave activity"}, 500
        
    # Notify host if query returned details successfully
    if info and info != "error":
        owner_id = info[0]["owner_id"]
        title = info[0]["title"]
        status = info[0]["status"]
        
        leaver = query_db("SELECT username FROM user WHERE user_id = %s", (user_id,))
        leaver_name = leaver[0]["username"] if leaver and leaver != "error" else "A player"
        
        if status == 'Accepted':
            msg = f"{leaver_name} left your activity '{title}'"[:50]
        else:
            msg = f"{leaver_name} cancelled request for '{title}'"[:50]
            
        execute_db(
            """
            INSERT INTO notification (user_id, type, notification_content, status)
            VALUES (%s, 'Notification', %s, 'Unread')
            """,
            (owner_id, msg)
        )
        socketIO.emit(
            "join_request_notification",
            {"owner_id": owner_id, "message": msg, "activity_id": activity_id},
            room=f"user_{owner_id}"
        )
    
    socketIO.emit("activities_updated")
    return {"message": "You have left the activity or canceled your request"}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>/requests", methods=["GET"])
def get_join_requests(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    activity = query_db("SELECT user_id FROM activity WHERE activity_id = %s", (activity_id,))
    if not activity or activity == "error":
        return {"error": "Activity not found"}, 404
    if activity[0]["user_id"] != user_id:
        return {"error": "Unauthorized"}, 403
    
    query = """
        SELECT ap.player_id, ap.user_id, ap.status, u.username, u.profile_pic, u.birthdate,
               sl.name AS requestor_skill_level
        FROM activity_player ap
        JOIN user u ON ap.user_id = u.user_id
        JOIN activity a ON ap.activity_id = a.activity_id
        LEFT JOIN user_detail ud ON ud.user_id = ap.user_id AND ud.sport = a.sport
        LEFT JOIN skill_level sl ON ud.skill_level = sl.skill_level_id
        WHERE ap.activity_id = %s
    """
    requests_list = query_db(query, (activity_id,))
    if requests_list == "error":
        return {"error": "Failed to fetch requests"}, 500

    for req in requests_list:
        birthdate = req.get("birthdate")
        if birthdate:
            try:
                req["age"] = calculate_age(birthdate)
            except Exception:
                req["age"] = None
        else:
            req["age"] = None
        if "birthdate" in req:
            del req["birthdate"]
    
    return {"requests": requests_list}, 200

@activity_hosting_bp.route("/activities/requests/<int:player_id>/status", methods=["POST"])
def respond_to_request(player_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
    
    data = request.json or {}
    status = data.get("status")  # 'Accepted' or 'Rejected'
    if status not in ['Accepted', 'Rejected']:
        return {"error": "Invalid status value"}, 400
    
    req_info = query_db(
        """
        SELECT ap.activity_id, ap.user_id, a.user_id as owner_id, a.title, a.date, a.start_time
        FROM activity_player ap
        JOIN activity a ON ap.activity_id = a.activity_id
        WHERE ap.player_id = %s
        """,
        (player_id,)
    )
    if not req_info or req_info == "error":
        return {"error": "Request not found"}, 404
    
    if req_info[0]["owner_id"] != user_id:
        return {"error": "Unauthorized"}, 403

    # Check if the activity has expired
    local_now = datetime.now()
    current_date = local_now.strftime("%Y-%m-%d")
    current_time = local_now.strftime("%H:%M:%S")
    act_date = req_info[0]["date"]
    act_time = req_info[0]["start_time"]
    
    if isinstance(act_date, (date, datetime)):
        act_date_str = act_date.strftime("%Y-%m-%d")
    else:
        act_date_str = str(act_date)

    if isinstance(act_time, timedelta):
        total_seconds = int(act_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        act_time_str = f"{hours:02d}:{minutes:02d}:00"
    elif hasattr(act_time, "strftime"):
        act_time_str = act_time.strftime("%H:%M:%S")
    else:
        act_time_str = str(act_time)
        
    if act_date_str < current_date or (act_date_str == current_date and act_time_str <= current_time):
        return {"error": "This activity has expired. You cannot accept or reject requests for it."}, 400
    
    result = execute_db(
        "UPDATE activity_player SET status = %s WHERE player_id = %s",
        (status, player_id)
    )
    if result == "error":
        return {"error": "Failed to update request status"}, 500
    
    # Send notification to the player
    player_user_id = req_info[0]["user_id"]
    act_title = req_info[0]["title"]
    act_id = req_info[0]["activity_id"]
    status_msg = "accepted" if status == "Accepted" else "rejected"
    message = f"Your request for '{act_title}' was {status_msg}."[:50]
    execute_db(
        """
        INSERT INTO notification (user_id, type, notification_content, status)
        VALUES (%s, 'Notification', %s, 'Unread')
        """,
        (player_user_id, message)
    )
    socketIO.emit(
        "join_request_notification",
        {"owner_id": player_user_id, "message": message, "activity_id": act_id},
        room=f"user_{player_user_id}"
    )
    
    socketIO.emit("activities_updated")
    return {"message": f"Request status updated to {status}"}, 200

@activity_hosting_bp.route("/activities/<int:activity_id>/players", methods=["GET"])
def get_accepted_players(activity_id):
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401
        
    activity = query_db("SELECT user_id, is_deleted FROM activity WHERE activity_id = %s", (activity_id,))
    if not activity or activity == "error":
        return {"error": "Activity not found"}, 404
    if activity[0]["is_deleted"] == 1:
        return {"error": "Activity has been deleted"}, 400
        
    query = """
        SELECT ap.player_id, ap.user_id, u.username, u.profile_pic, u.birthdate,
               sl.name AS requestor_skill_level
        FROM activity_player ap
        JOIN user u ON ap.user_id = u.user_id
        JOIN activity a ON ap.activity_id = a.activity_id
        LEFT JOIN user_detail ud ON ud.user_id = ap.user_id AND ud.sport = a.sport
        LEFT JOIN skill_level sl ON ud.skill_level = sl.skill_level_id
        WHERE ap.activity_id = %s AND ap.status = 'Accepted'
    """
    players_list = query_db(query, (activity_id,))
    if players_list == "error":
        return {"error": "Failed to fetch joined players"}, 500
        
    for req in players_list:
        birthdate = req.get("birthdate")
        if birthdate:
            try:
                req["age"] = calculate_age(birthdate)
            except Exception:
                req["age"] = None
        else:
            req["age"] = None
        if "birthdate" in req:
            del req["birthdate"]
            
    return {"players": players_list}, 200
