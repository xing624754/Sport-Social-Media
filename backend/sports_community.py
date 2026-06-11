from flask import request, Blueprint, send_from_directory, session
import os
from extensions import query_db, execute_db, socketIO
from datetime import datetime

sports_community_bp = Blueprint("sports_community", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")

# get all communities and sort them by no. of members (popularity)
@sports_community_bp.route("/load-communities", methods=["POST"])
def load_communities():
    data = request.get_json()

    user_id = data.get("userID")
    current_no_of_communities = data.get("currentNoOfCommunities")

    # first time load communities
    if not current_no_of_communities:
        query = """
            SELECT 
                community.community_id, 
                community.name, 
                community.bio,
                community.publicity,
                community.created_at,
                community.admin_id,
                chat.chat_id,
                ucm.role,
                ucm.join_status,
                COALESCE(mc.member_count, 0) AS member_count

            FROM community

            JOIN chat 
                ON chat.community_id = community.community_id

            LEFT JOIN (
                SELECT 
                    community_id,
                    COUNT(*) AS member_count
                FROM community_member
                WHERE join_status = 'Joined'
                GROUP BY community_id
            ) mc
                ON community.community_id = mc.community_id

            LEFT JOIN community_member ucm
                ON community.community_id = ucm.community_id
                AND ucm.user_id = %s

            WHERE community.is_deleted = 0

            ORDER BY member_count DESC
            LIMIT 10
        """
        communities = query_db(query, (user_id,))
        if communities == "error":
            return {"error": "Something went wrong"}, 400
        
        return {"communities": communities}

    # load more communities
    if current_no_of_communities:
        query = """
            SELECT 
                community.community_id, 
                community.name, 
                community.bio,
                community.publicity,
                community.created_at,
                community.admin_id,
                chat.chat_id,
                ucm.role,
                ucm.join_status,
                COALESCE(mc.member_count, 0) AS member_count

            FROM community

            JOIN chat 
                ON chat.community_id = community.community_id

            LEFT JOIN (
                SELECT 
                    community_id,
                    COUNT(*) AS member_count
                FROM community_member
                WHERE join_status = 'Joined'
                GROUP BY community_id
            ) mc
                ON community.community_id = mc.community_id

            LEFT JOIN community_member ucm
                ON community.community_id = ucm.community_id
                AND ucm.user_id = %s

            WHERE community.is_deleted = 0

            ORDER BY member_count DESC
            LIMIT 10 OFFSET %s
        """
        communities = query_db(query, (user_id, current_no_of_communities))
        if communities == "error":
            return {"error": "Something went wrong"}, 400
        
        return {"communities": communities}


# load joined communities
@sports_community_bp.route("/load-joined-communities", methods=["POST"])
def load_joined_communities():
    data = request.get_json()

    user_id = data.get("userID")
    current_no_of_communities = data.get("currentNoOfCommunities")

    # first time load joined communities
    if not current_no_of_communities:
        query = """
            SELECT 
                community.community_id,
                community.name,
                community.bio,
                community.publicity,
                community.created_at,
                chat.chat_id,
                cm.role,
                cm.join_date,
                cm.join_status,
                COUNT(DISTINCT all_cm.user_id) AS member_count
            FROM community

            JOIN community_member cm
                ON community.community_id = cm.community_id
                AND cm.user_id = %s
                AND cm.join_status = 'Joined'

            JOIN chat 
                ON chat.community_id = community.community_id

            LEFT JOIN community_member all_cm 
                ON community.community_id = all_cm.community_id 
                AND all_cm.join_status = 'Joined'

            WHERE community.is_deleted = 0

            GROUP BY 
                community.community_id,
                community.name,
                community.bio,
                community.publicity,
                community.created_at,
                chat.chat_id,
                cm.role,
                cm.join_date,
                cm.join_status

            ORDER BY cm.join_date DESC
            LIMIT 10
        """
        communities = query_db(query, (user_id,))
        if communities == "error":
            return {"error": "Something went wrong"}, 400
    
        return {"communities": communities}

        
    # load more joined communities
    if current_no_of_communities:
        query = """
            SELECT 
                community.community_id,
                community.name,
                community.bio,
                community.publicity,
                community.created_at,
                chat.chat_id,
                cm.role,
                cm.join_date,
                cm.join_status,
                COUNT(DISTINCT all_cm.user_id) AS member_count
            FROM community

            JOIN community_member cm
                ON community.community_id = cm.community_id
                AND cm.user_id = %s
                AND cm.join_status = 'Joined'

            JOIN chat 
                ON chat.community_id = community.community_id

            LEFT JOIN community_member all_cm 
                ON community.community_id = all_cm.community_id 
                AND all_cm.join_status = 'Joined'

            WHERE community.is_deleted = 0

            GROUP BY 
                community.community_id,
                community.name,
                community.bio,
                community.publicity,
                community.created_at,
                chat.chat_id,
                cm.role,
                cm.join_date,
                cm.join_status

            ORDER BY cm.join_date DESC
            LIMIT 10 OFFSET %s
        """
        communities = query_db(query, (user_id, current_no_of_communities))
        if communities == "error":
            return {"error": "Something went wrong"}, 400
    
        return {"communities": communities}

# create a sports community
@sports_community_bp.route("/create-community", methods=["POST"])
def create_community():
    data = request.get_json()

    user_id = data.get("userID")
    community_name = data.get("communityName")
    community_bio = data.get("communityBio")
    publicity = data.get("publicity")

    add_community_query = """
        INSERT INTO community(admin_id, name, bio, publicity, is_deleted)
        VALUES(%s, %s, %s, %s, 0)
    """
    community_id = execute_db(add_community_query, (user_id, community_name, community_bio, publicity))
    if community_id == "error":
        return {"error": "Something went wrong"}, 400
    
    add_admin_query = """
        INSERT INTO community_member(user_id, community_id, role, join_status, join_date)
        VALUES(%s, %s, 'Admin', 'Joined', NOW())
    """
    add_admin = execute_db(add_admin_query, (user_id, community_id))
    if add_admin == "error":
        return {"error": "Something went wrong"}, 400
    
    create_group_chat_query = """
        INSERT INTO chat(created_by, type, name, community_id, is_deleted)
        VALUES(%s, 'Group', %s, %s, 0)
    """
    chat_id = execute_db(create_group_chat_query, (user_id, community_name, community_id))
    if chat_id == "error":
        return {"error": "Something went wrong"}, 400
    
    add_chat_admin_query = """
        INSERT INTO chat_member(user_id, chat_id, role, is_removed)
        VALUES(%s, %s, 'Admin', 0)
    """
    add_admin = execute_db(add_chat_admin_query, (user_id, chat_id))
    if add_admin == "error":
        return {"error": "Something went wrong"}, 400
    
    # add community to joined communities
    community_info = {
        "community_id": community_id,
        "name": community_name,
        "bio": community_bio,
        "publicity": publicity,
        "created_at": datetime.now(),
        "chat_id": chat_id,
        "role": "Admin",
        "join_date": datetime.now(),
        "join_status": "Joined",
        "member_count": 1
    }

    socketIO.emit("communities_updated")
    return {"success": "Community created successfully",
            "community_info": community_info}


# add member into community group chat
def add_chat_member(user_id, chat_id):
    # checks if chat member record exists
    chat_record_exists = query_db("SELECT * FROM chat_member WHERE user_id = %s AND chat_id = %s", (user_id, chat_id))
    if chat_record_exists == "error":
        return False
    
    # if record exists, add join_at and toggle is_removed
    if chat_record_exists:
        update_chat_member_query = """
            UPDATE chat_member
            SET join_at = NOW(),
            left_at = NULL,
            is_removed = 0
            WHERE user_id = %s
            AND chat_id = %s
        """
        update_chat_member = execute_db(update_chat_member_query, (user_id, chat_id))
        if update_chat_member == "error":
            return False
        
    # if not exist, add a new chat member record
    if not chat_record_exists:
        add_chat_member_query = """
            INSERT INTO chat_member(user_id, chat_id, role, is_removed)
            VALUES(%s, %s, 'Member', 0)
        """
        add_chat_member = execute_db(add_chat_member_query, (user_id, chat_id))
        if add_chat_member == "error":
            return False
    
    return True


# get community member record to check if this user has joined the community before
def get_member_record(user_id, community_id):
    # checks if user has joined or sent a request before
    record_exists = query_db("SELECT * FROM community_member WHERE user_id = %s AND community_id = %s", (user_id, community_id))
    if record_exists == "error":
        return "error"
    
    return record_exists
    

# add user into community
def add_member(record_exists, user_id, community_id, chat_id):
    # if record exists, update status to joined and add join_date
    if record_exists:
        query = """
            UPDATE community_member
            SET join_status = 'Joined',
            join_date = NOW(),
            exit_date = NULL
            WHERE user_id = %s
            AND community_id = %s
        """
        update_status = execute_db(query, (user_id, community_id))
        if update_status == "error":
            return False
        
    if not record_exists:
        add_record_query = """
            INSERT INTO community_member(user_id, community_id, role, join_status, join_date)
            VALUES(%s, %s, 'Member', 'Joined', NOW())
        """
        add_record = execute_db(add_record_query, (user_id, community_id))
        if add_record == "error":
            return False
        

    # after updating member record, add the user to group chat
    if not add_chat_member(user_id, chat_id):
        return False
    
    return True


# join community
@sports_community_bp.route("/join-community", methods=["POST"])
def join_community():
    data = request.get_json()

    user_id = data.get("userID")
    community_info = data.get("communityInfo")

    community_id = community_info.get("community_id")
    community_type = community_info.get("publicity")
    chat_id = community_info.get("chat_id")
    admin_id = community_info.get("admin_id")
    community_name = community_info.get("name")

    record_exists = get_member_record(user_id, community_id)
    if record_exists == "error":
        return {"error": "Something went wrong"}, 400
    
    
    if community_type == "Private":
        # if record exists, only toggle status to pending
        if record_exists:
            update_status = execute_db("UPDATE community_member SET join_status = 'Pending' WHERE user_id = %s AND community_id = %s", (user_id, community_id))
            if update_status == "error":
                return {"error": "Something went wrong"}, 400
        
        # if not, add a new record
        if not record_exists:
            add_request_query = """
                INSERT INTO community_member(user_id, community_id, role, join_status)
                VALUES(%s, %s, 'Member', 'Pending')
            """
            add_request = execute_db(add_request_query, (user_id, community_id))
            if add_request == "error":
                return {"error": "Something went wrong"}, 400
            
        # send a notification to admin (new request)
        add_notification_query = """
            INSERT INTO notification(user_id, type, notification_content, status)
            VALUES(%s, 'Notification', %s, 'Unread')
        """
        content = f"You have a new join request for {community_name}."
        add_notification = execute_db(add_notification_query, (admin_id, content))
        if add_notification == "error":
            return {"error": "Something went wrong"}, 400
    
    elif community_type == "Public":
        if not add_member(record_exists, user_id, community_id, chat_id):
            return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": True}


# cancel join private community request
@sports_community_bp.route("/cancel-join-request", methods=["POST"])
def cancel_join_request():
    data = request.get_json()

    user_id = data.get("userID")
    community_id = data.get("communityID")

    query = """
        UPDATE community_member
        SET join_status = 'Rejected'
        WHERE user_id = %s
        AND community_id = %s
    """
    update_status = execute_db(query, (user_id, community_id))
    if update_status == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": True}


# edit community details
@sports_community_bp.route("/edit-community-details", methods=["POST"])
def edit_community_details():
    data = request.get_json()

    previous_details = data.get("previousDetails")
    community_name = data.get("communityName")
    community_bio = data.get("communityBio")
    publicity = data.get("publicity")

    community_id = previous_details.get("community_id")
    previous_publicity = previous_details.get("publicity")
    chat_id = previous_details.get("chat_id")

    update_query = """
        UPDATE community
        SET name = %s,
        bio = %s,
        publicity = %s
        WHERE community_id = %s
    """
    update_details = execute_db(update_query, (community_name, community_bio, publicity, community_id))
    if update_details == "error":
        return {"error": "Something went wrong"}, 400
    
    pending_members = []
    
    # if private changed to public, automatically approve all join requests
    if publicity == "Public" and previous_publicity == "Private":

        # get pending members and their chat member record
        get_pending_members = """
            SELECT cm1.user_id
            FROM community_member cm1

            LEFT JOIN chat_member cm2
            ON cm1.user_id = cm2.user_id
            AND cm2.chat_id = %s

            WHERE cm1.join_status = 'Pending'
            AND cm1.community_id = %s
        """
        pending_members = query_db(get_pending_members, (chat_id, community_id))
        if pending_members == "error":
            return {"error": "Something went wrong"}, 400

        if pending_members:
            # approve all join requests
            update_request_query = """
                UPDATE community_member
                SET join_status = 'Joined',
                join_date = NOW(),
                exit_date = NULL
                WHERE community_id = %s
                AND join_status = 'Pending'
            """
            update_requests = execute_db(update_request_query, (community_id,))
            if update_requests == "error":
                return {"error": "Something went wrong"}, 400
            
            # add approved members into group chat
            for member in pending_members:
                user_id = member.get("user_id")
                if not add_chat_member(user_id, chat_id):
                    return {"error": "Something went wrong"}, 400
                
                # notify user
                add_notification_query = """
                    INSERT INTO notification(user_id, type, notification_content, status)
                    VALUES(%s, 'Notification', %s, 'Unread')
                """
                notification = f"Your request to join {community_name} had been approved."
                add_notification = execute_db(add_notification_query, (user_id, notification))
                if add_notification == "error":
                    return {"error": "Something went wrong"}, 400
                
    socketIO.emit("communities_updated")
    return {"success": "Community details saved",
            "pending_members": pending_members}


# load join community requests
@sports_community_bp.route("/load-requests", methods=["POST"])
def load_requests():
    data = request.get_json()
    community_id = data.get("communityID")

    get_request_query = """
        SELECT cm.member_id, user.user_id, user.username, user.profile_pic
        FROM community_member cm
        JOIN user ON cm.user_id = user.user_id
        WHERE cm.community_id = %s
        AND join_status = 'Pending'
    """
    requests = query_db(get_request_query, (community_id,))

    if requests == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"requests": requests}


@sports_community_bp.route("/uploads/profile_pics/<path:filename>")
def uploaded_profile_pics(filename):
    return send_from_directory(
        os.path.join(UPLOAD_ROOT, "profile_pics"),
        filename
    )

@sports_community_bp.route("/uploads/posts/<path:filename>")
def uploaded_post_media(filename):
    return send_from_directory(
        os.path.join(UPLOAD_ROOT, "posts"),
        filename
    )

# approve a join community request
@sports_community_bp.route("/approve-request", methods=["POST"])
def approve_request():
    data = request.get_json()

    request_info = data.get("request")
    request_id = request_info.get("member_id")
    user_id = request_info.get("user_id")
    chat_id = data.get("chatID")
    community_name = data.get("communityName")


    # update status to joined
    update_status_query = """
        UPDATE community_member
        SET join_status = 'Joined',
        join_date = NOW(),
        exit_date = NULL
        WHERE member_id = %s
    """
    update_status = execute_db(update_status_query, (request_id,))
    if update_status == "error":
        return {"error": "Something went wrong"}, 400
    
    # add approved member into group chat
    if not add_chat_member(user_id, chat_id):
        return {"error": "Something went wrong"}, 400
    
    # notify user
    add_notification_query = """
        INSERT INTO notification(user_id, type, notification_content, status)
        VALUES(%s, 'Notification', %s, 'Unread')
    """
    notification = f"Your request to join {community_name} had been approved."
    add_notification = execute_db(add_notification_query, (user_id, notification))
    if add_notification == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": True}


# reject a join community request
@sports_community_bp.route("/reject-request", methods=["POST"])
def reject_request():
    data = request.get_json()

    request_info = data.get("requestInfo")
    member_id = request_info.get("member_id")
    user_id = request_info.get("user_id")

    community_name = data.get("communityName")

    # update status to rejected
    update_status_query = """
        UPDATE community_member
        SET join_status = 'Rejected'
        WHERE member_id = %s
    """
    update_status = execute_db(update_status_query, (member_id,))
    if update_status == "error":
        return {"error": "Something went wrong"}, 400
    
    # notify user
    add_notification_query = """
        INSERT INTO notification(user_id, type, notification_content, status)
        VALUES(%s, 'Notification', %s, 'Unread')
    """
    notification = f"Your request to join {community_name} had been rejected."
    add_notification = execute_db(add_notification_query, (user_id, notification))
    if add_notification == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": True}


# load other users that are not in community
@sports_community_bp.route("/load-other-users", methods=["POST"])
def load_other_users():
    data = request.get_json()
    community_id = data.get("communityID")

    get_users_query = """
        SELECT user.user_id, user.username, user.profile_pic
        FROM user
        LEFT JOIN community_member cm
            ON cm.user_id = user.user_id
            AND cm.community_id = %s
        WHERE user.role = 'User'
        AND (cm.member_id IS NULL
            OR cm.join_status != 'Joined') 
    """
    other_users = query_db(get_users_query, (community_id,))
    if other_users == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"other_users": other_users}


# add members into community
@sports_community_bp.route("/add-members", methods=["POST"])
def add_members():
    data = request.get_json()

    selected_users = data.get("selectedUsers")
    community_info = data.get("communityInfo")
    community_id = community_info.get("community_id")
    chat_id = community_info.get("chat_id")

    for user in selected_users:
        record_exists = get_member_record(user.get("userID"), community_id)

        if not add_member(record_exists, user.get("userID"), community_id, chat_id):
            return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": "New members added"}


# load existing community members
@sports_community_bp.route("/load-existing-members", methods=["POST"])
def load_existing_members():
    data = request.get_json()
    community_id = data.get("communityID")

    get_member_query = """
        SELECT user.user_id, user.username, user.profile_pic
        FROM user
        JOIN community_member cm ON cm.user_id = user.user_id
        WHERE cm.community_id = %s
        AND cm.join_status = 'Joined'
        AND cm.role = 'Member'
        ORDER BY user.username
    """
    existing_members = query_db(get_member_query, (community_id,))
    if existing_members == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"existing_members": existing_members}


# update deleted member status to exited
def update_delete_member_status(community_id, user_id):
    update_status_query = """
        UPDATE community_member
        SET join_status = 'Exited',
        exit_date = NOW()
        WHERE community_id = %s
        AND user_id = %s
    """
    update_status = execute_db(update_status_query, (community_id, user_id))
    if update_status == "error":
        return False
    
    return True


# delete members from community and chat
@sports_community_bp.route("/delete-members", methods=["POST"])
def delete_members():
    data = request.get_json()

    selected_members = data.get("selectedDeleteMembers")
    community_info = data.get("communityInfo")
    community_id = community_info.get("community_id")
    chat_id = community_info.get("chat_id")

    for member in selected_members:
        user_id = member.get("userID")

        # update member status to exited
        if not update_delete_member_status(community_id, user_id):
            return {"error": "Something went wrong"}, 400
        
        # remove user from group chat
        remove_from_chat_query = """
            UPDATE chat_member
            SET left_at = NOW(),
            is_removed = 1
            WHERE user_id = %s
            AND chat_id = %s
        """
        remove_from_chat = execute_db(remove_from_chat_query, (user_id, chat_id))
        if remove_from_chat == "error":
            return {"error": "Something went wrong"}, 400

    socketIO.emit("communities_updated")
    return {"success": "Selected members are removed"}


# delete a community and its group chat
@sports_community_bp.route("/delete-community", methods=["POST"])
def delete_community():
    data = request.get_json()

    community_info = data.get("communityInfo")
    community_id = community_info.get("community_id")
    chat_id = community_info.get("chat_id")

    # toggle community is_deleted status
    update_community_status = execute_db("UPDATE community SET is_deleted = 1 WHERE community_id = %s", (community_id,))
    if update_community_status == "error":
        return {"error": "Something went wrong"}, 400

    # update member's status to exited
    update_member_query = """
        UPDATE community_member
        SET join_status = 'Exited',
        exit_date = NOW()
        WHERE community_id = %s
        AND join_status = 'Joined'
    """
    update_member = execute_db(update_member_query, (community_id,))
    if update_member == "error":
        return {"error": "Something went wrong"}, 400

    # toggle chat is_deleted status
    update_chat_status = execute_db("UPDATE chat SET is_deleted = 1 WHERE community_id = %s", (community_id,))
    if update_chat_status == "error":
        return {"error": "Something went wrong"}, 400
    
    # remove admin from chat
    remove_admin_query = """
        DELETE FROM chat_member
        WHERE chat_id = %s
        AND role = 'Admin'
    """
    remove_admin = execute_db(remove_admin_query, (chat_id,))
    if remove_admin == "error":
        return {"error": "Something went wrong"}, 400

    # remove members from chat
    update_chat_member_query = """
        UPDATE chat_member
        SET left_at = NOW(),
        is_removed = 1
        WHERE chat_id = %s
    """
    update_chat_member = execute_db(update_chat_member_query, (chat_id,))
    if update_chat_member == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": "Community deleted"}


# leave a community and group chat
@sports_community_bp.route("/leave-community", methods=["POST"])
def leave_community():
    data = request.get_json()

    community_info = data.get("communityInfo")
    community_id = community_info.get("community_id")
    chat_id = community_info.get("chat_id")
    user_id = data.get("userID")

    # update member status to exited
    update_member_status_query = """
        UPDATE community_member
        SET join_status = 'Exited',
        exit_date = NOW()
        WHERE community_id = %s
        AND user_id = %s
    """
    update_member_status = execute_db(update_member_status_query, (community_id, user_id))
    if update_member_status == "error":
        return {"error": "Something went wrong"}, 400

    # leave group chat
    remove_from_chat = execute_db("DELETE FROM chat_member WHERE user_id = %s AND chat_id = %s", (user_id, chat_id))
    if remove_from_chat == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit("communities_updated")
    return {"success": "You have left the community"}


# get community report content
@sports_community_bp.route("/get-report-content", methods=["POST"])
def get_report_content():
    data = request.get_json()

    community_id = data.get("communityID")
    selected_month = data.get("selectedMonth")

    # get current total no. of community members
    get_total_members_query = """
        SELECT COUNT(*) AS total_member_count
        FROM community_member
        WHERE community_id = %s
        AND join_status = 'Joined'
    """
    total_members = query_db(get_total_members_query, (community_id,))
    if total_members == "error":
        return {"error": "Something went wrong"}, 400
    
    total_member_count = total_members[0].get("total_member_count")
        

    # get new members in selected month
    get_new_members_query = """
        SELECT COUNT(*) AS new_member_count
        FROM community_member
        WHERE community_id = %s
        AND join_status = 'Joined'
        AND role = 'Member'
        AND join_date >= CONCAT(%s, '-01')
        AND join_date < DATE_ADD(CONCAT(%s, '-01'), INTERVAL 1 MONTH)
    """
    new_members = query_db(get_new_members_query, (community_id, selected_month, selected_month))
    if new_members == "error":
        return {"error": "Something went wrong"}, 400
        
    new_member_count = new_members[0].get("new_member_count")


    # get new posts in selected month
    get_new_posts_query = """
        SELECT COUNT(*) AS new_post_count
        FROM community_post cp
        JOIN post ON post.post_id = cp.post_id
        WHERE cp.community_id = %s
        AND cp.is_deleted = 0
        AND post.timestamp >= CONCAT(%s, '-01')
        AND post.timestamp < DATE_ADD(CONCAT(%s, '-01'), INTERVAL 1 MONTH)
    """
    new_posts = query_db(get_new_posts_query, (community_id, selected_month, selected_month))
    if new_posts == "error":
        return {"error": "Something went wrong"}, 400

    new_post_count = new_posts[0].get("new_post_count")

    # get the 5 most active members based on no.of posts created
    get_active_members_query = """
        SELECT 
            u.user_id,
            u.username,
            COUNT(p.post_id) AS post_count
        FROM community_member cm
        JOIN user u ON u.user_id = cm.user_id

        LEFT JOIN community_post cp 
            ON cp.community_id = cm.community_id
            AND cp.is_deleted = 0

        LEFT JOIN post p 
            ON p.post_id = cp.post_id
            AND p.user_id = u.user_id
            AND p.timestamp >= CONCAT(%s, '-01')
            AND p.timestamp < DATE_ADD(CONCAT(%s, '-01'), INTERVAL 1 MONTH)

        WHERE cm.community_id = %s
        AND cm.join_status = 'Joined'
        AND cm.role = 'Member'

        GROUP BY u.user_id, u.username
        HAVING post_count > 0
        ORDER BY post_count DESC
        LIMIT 5
    """
    active_members = query_db(get_active_members_query, (selected_month, selected_month, community_id))
    if active_members == "error":
        return {"error": "Something went wrong"}, 400


    report_content = {
        "total_member_count": total_member_count,
        "new_member_count": new_member_count,
        "new_post_count": int(new_post_count),
        "active_members": active_members
    }

    return {"report_content": report_content}


# checks if user is in community chat, or else add the user into the chat
@sports_community_bp.route("/check-user-in-chat", methods=["POST"])
def check_user_in_chat():
    data = request.get_json()

    chat_id = data.get("chatID")
    user_id = data.get("userID")

    chat_member_exists = query_db("SELECT is_removed FROM chat_member WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))
    if chat_member_exists == "error":
        return {"error": "Something went wrong"}, 400
    
    if chat_member_exists and chat_member_exists[0].get("is_removed") == 1:
        update_member_query = """
            UPDATE chat_member 
            SET join_at = NOW(),
            left_at = NULL,
            is_removed = 0
            WHERE user_id = %s
            AND chat_id = %s
        """
        update_member_status = execute_db(update_member_query, (user_id, chat_id))
        if update_member_status == "error":
            return {"error": "Something went wrong"}, 400
        
    if not chat_member_exists:
        add_member_query = """
            INSERT INTO chat_member(user_id, chat_id, role, is_removed)
            VALUES(%s, %s, 'Member', 0)
        """
        add_member = execute_db(add_member_query, (user_id, chat_id))
        if add_member == "error":
            return {"error": "Something went wrong"}, 400

    return {"success": True}


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


# get all posts and sort them by posting time
@sports_community_bp.route("/load-posts", methods=["POST"])
def load_posts():
    data = request.get_json()

    community_id = data.get("communityID")
    current_no_of_posts = data.get("currentNoOfPosts")
    user_id = data.get("userID")

    # first time load posts
    if not current_no_of_posts:
        query = """
            SELECT 
                post.post_id,
                post.user_id,
                post.timestamp,
                post.title,
                post.description,
                post.num_of_like,
                post.num_of_comment,
                user.username

            FROM post

            JOIN community_post cp
                ON post.post_id = cp.post_id

            JOIN user
                ON post.user_id = user.user_id

            WHERE post.publicity = 'Community'
            AND post.is_deleted = 0
            AND post.type = 'Post'
            AND cp.community_id = %s

            ORDER BY post.timestamp DESC
            LIMIT 10
        """
        
        posts_data = query_db(query, (community_id,))
        if posts_data == "error":
            return {"error": "Something went wrong"}, 400
                

    # load more posts
    else:
        query = """
            SELECT 
                post.post_id,
                post.user_id,
                post.timestamp,
                post.title,
                post.description,
                post.num_of_like,
                post.num_of_comment,
                user.username

            FROM post

            JOIN community_post cp
                ON post.post_id = cp.post_id

            JOIN user
                ON post.user_id = user.user_id

            WHERE post.publicity = 'Community'
            AND post.is_deleted = 0
            AND post.type = 'Post'
            AND cp.community_id = %s

            ORDER BY post.timestamp DESC
            LIMIT 10 OFFSET %s
        """
        posts_data = query_db(query, (community_id, current_no_of_posts))
        if posts_data == "error":
            return {"error": "Something went wrong"}, 400
        
    # get media urls for each post
    posts = []
    for post in posts_data:
        post_id = post.get("post_id")

        get_media_query = """
            SELECT media_url
            FROM post_media
            WHERE post_id = %s
        """
        media_data = query_db(get_media_query, (post_id,))
        if media_data == "error":
            return {"error": "Something went wrong"}, 400
        
        media_urls = []
        if media_data:
            for media in media_data:
                media_urls.append(media.get("media_url"))

        post_info = {
            "post_id": post_id,
            "user_id": post.get("user_id"),
            "username": post.get("username"),
            "timestamp": post.get("timestamp"),
            "title": post.get("title"),
            "description": post.get("description"),
            "num_of_like": post.get("num_of_like"),
            "num_of_comment": post.get("num_of_comment"),
            "media_urls": media_urls,
        }

        posts.append(post_info)

    if posts:
        attach_hashtags(posts)
        attach_user_state(posts, user_id)

    return {"posts": posts}