from flask import Blueprint, request, session, send_from_directory
import os
from extensions import query_db, execute_db
from extensions import socketIO
from werkzeug.utils import secure_filename

chat_bp = Blueprint("chat", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")

# calculate total unread messages
@chat_bp.route("/load-total-unread-count", methods=["POST"])
def load_total_unread_count():
    data = request.get_json()

    current_user_id = data.get("userID")

    unread_query = """
        SELECT COUNT(message.message_id) AS total_unread_count
        FROM message
        JOIN message_status
        ON message.message_id = message_status.message_id
        JOIN chat
        ON chat.chat_id = message.chat_id
        JOIN chat_member
        ON chat_member.chat_id = chat.chat_id
        WHERE chat_member.user_id = %s
        AND message_status.user_id = %s
        AND message_status.is_read = 0
        AND chat.is_deleted = 0
    """
    unread_data = query_db(unread_query, (current_user_id, current_user_id))

    if unread_data == "error":
        return {"error": "Something went wrong"}, 400
    
    if unread_data and len(unread_data) > 0:
        total_unread_count = unread_data[0].get("total_unread_count")
    else:
        total_unread_count = 0
    


    
    return {"total_unread_count": total_unread_count}

# get all chats
def get_chats(current_user_id):

    get_chat_query = """
        SELECT 
            chat.chat_id,
            chat.type,
            chat.name,
            chat_member.is_removed,
            COALESCE(MAX(message.sent_at), chat.created_at) AS latest_activity
        FROM chat
        JOIN chat_member
            ON chat.chat_id = chat_member.chat_id

        LEFT JOIN message
            ON chat.chat_id = message.chat_id

        WHERE chat_member.user_id = %s

        GROUP BY
            chat.chat_id,
            chat.type,
            chat.name,
            chat_member.is_removed,
            chat.created_at

        ORDER BY latest_activity DESC
    """

    chat_data = query_db(get_chat_query, (current_user_id,))
    if chat_data == "error":
        return {"error": "Something went wrong"}, 400
    
    user_chats = []
    for chat in chat_data:
        chat_id = chat.get("chat_id")

        chat_name = chat.get("name")
        chat_icon = ""

        # set chat name as username and chat icon as user's profile pic if the chat is private
        if chat.get("type") == "Private":
            query = """
                SELECT user.username, user.profile_pic
                FROM user
                JOIN chat_member
                ON user.user_id = chat_member.user_id
                WHERE chat_member.chat_id = %s
                AND chat_member.user_id != %s
            """
            user_data = query_db(query, (chat_id, current_user_id))
            if user_data == "error":
                return {"error": "Something went wrong"}, 400
            
            if user_data:
                chat_name = user_data[0].get("username")
                chat_icon = user_data[0].get("profile_pic")
            
            
        # get the latest message and its sender
        get_latest_msg_query = """
            SELECT message.sender_id, user.username, message.message_text
            FROM user
            JOIN message 
                ON user.user_id = message.sender_id
            JOIN chat_member
                ON chat_member.chat_id = message.chat_id
                AND chat_member.user_id = %s
            WHERE message.chat_id = %s
            AND message.sent_at >= chat_member.join_at
            AND (
                chat_member.left_at IS NULL
                OR message.sent_at <= chat_member.left_at
            )
            ORDER BY message.sent_at DESC
            LIMIT 1
        """
        latest_message_data = query_db(get_latest_msg_query, (current_user_id, chat_id))
        if latest_message_data == "error":
            return {"error": "Something went wrong"}, 400
        
        message = ""
        sender_username = ""
        sender_user_id = None

        if latest_message_data:
            latest_message = latest_message_data[0]
            message = latest_message.get("message_text")
            sender_user_id = latest_message.get("sender_id")
            sender_username = latest_message.get("username")

            # if no text sent, means that the sender only attached a file
            if message == "":
                message = "[Attached a file]"            

        # get total unread count for each chat
        get_total_unread_query = """
            SELECT COUNT(DISTINCT message.message_id) AS total_unread_count
            FROM message
            JOIN message_status ON message.message_id = message_status.message_id
            WHERE message_status.user_id = %s
            AND message.chat_id = %s
            AND message_status.is_read = 0
        """
        total_unread_data = query_db(get_total_unread_query, (current_user_id, chat_id))
        if total_unread_data == "error":
            return {"error": "Something went wrong"}, 400
        
        total_unread_count = total_unread_data[0].get("total_unread_count")

        chat_info = {
            "chat_id": chat.get("chat_id"),
            "chat_type": chat.get("type"),
            "chat_name": chat_name,
            "chat_icon": chat_icon,
            "is_removed": chat.get("is_removed"),
            "latest_msg_user_id" : sender_user_id,
            "latest_msg_username": sender_username,
            "latest_msg_text": message,
            "total_unread_count": total_unread_count
        }

        user_chats.append(chat_info)
    
    return user_chats


# load chat history
@chat_bp.route("/load-chats", methods=["POST"])
def load_chats():
    data = request.get_json()

    current_user_id = data.get("userID")

    user_chats = get_chats(current_user_id)



    unread_query = """
        SELECT COUNT(message.message_id) AS total_unread_count
        FROM message
        JOIN message_status
        ON message.message_id = message_status.message_id
        JOIN chat
        ON chat.chat_id = message.chat_id
        JOIN chat_member
        ON chat_member.chat_id = chat.chat_id
        WHERE chat_member.user_id = %s
        AND message_status.user_id = %s
        AND message_status.is_read = 0
        AND chat.is_deleted = 0
    """
    unread_data = query_db(unread_query, (current_user_id, current_user_id))
    total_unread_count = unread_data[0]["total_unread_count"]


    return ({
        "user_chats": user_chats
    }), 200


# load other users
@chat_bp.route("/load-other-users", methods=["POST"])
def load_other_users():
    data = request.get_json()
    current_user_id = data.get("userID")

    query = """
        SELECT user_id, username, profile_pic FROM user
        WHERE user_id != %s AND role = 'User'
    """

    other_user_data = query_db(query, (current_user_id,))

    if other_user_data == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"other_user_data": other_user_data}


# create group chat
@chat_bp.route("/new-group", methods=["POST"])
def new_group():
    data = request.get_json()

    user_id = data.get("userID")
    group_name = data.get("groupName")
    selected_users = data.get("selectedUsers")

    if not group_name or not selected_users:
        return {"error": "Missing fields"}, 400

    create_chat_query = """
        INSERT INTO chat(created_by, type, name, is_deleted)
        VALUES(%s, 'Group', %s, 0)
    """
    try:
        chat_id = execute_db(create_chat_query, (user_id, group_name))
        if chat_id == "error":
            return {"error": "Something went wrong"}, 400
        
        add_admin_query = """
            INSERT INTO chat_member(user_id, chat_id, role, is_removed)
            VALUES(%s, %s, 'Admin', 0)
        """
        add_group_admin = execute_db(add_admin_query, (user_id, chat_id))
        if add_group_admin == "error":
            return {"error": "Something went wrong"}, 400
        
        for user in selected_users:
            selected_user_id = user.get("userID")

            add_member_query = """
                INSERT INTO chat_member(user_id, chat_id, role, is_removed)
                VALUES(%s, %s, 'Member', 0)
            """
            add_group_member = execute_db(add_member_query, (selected_user_id, chat_id))

            if add_group_member == "error":
                return {"error": "Something went wrong"}, 400
            
            user_chats = get_chats(selected_user_id)

            socketIO.emit(
                "update_all_chats",
                {
                    "user_id": selected_user_id,
                    "user_chats": user_chats
                },
                room=f"user_{selected_user_id}"
            )
    
    except:
        return {"error": "Group creation failed"}, 400
    
    # refresh UI
    user_chats = get_chats(user_id)

    socketIO.emit(
        "update_all_chats",
        {
            "user_id": user_id,
            "user_chats": user_chats
        },
        room=f"user_{user_id}"
    )
        
    return {"success": "Group chat created successfully",
            "chat_id": chat_id,
            "user_chats": user_chats}


# create new private chat
@chat_bp.route("/new-chat", methods=["POST"])
def new_chat():
    data = request.get_json()

    current_user_id = data.get("userID")
    selected_user = data.get("selectedUser")
    selected_user_id = selected_user.get("userID")

    chat_exists_query = """
        SELECT c.chat_id, cm1.is_removed
        FROM chat c
        JOIN chat_member cm1 ON cm1.chat_id = c.chat_id
        JOIN chat_member cm2 ON cm2.chat_id = c.chat_id
        WHERE c.type = 'Private'
        AND cm1.user_id = %s
        AND cm2.user_id = %s
        LIMIT 1
    """

    chat_exists = query_db(chat_exists_query, (current_user_id, selected_user_id))
    if chat_exists == "error":
        return {"error": "Something went wrong"}, 400

    # chat exists
    if chat_exists and chat_exists[0].get("is_removed") == 0:
        return {"error": "Chat exists"}, 400
    
    # chat exists but current user deleted it, so toggle the status and restore the chat
    if chat_exists and chat_exists[0].get("is_removed") == 1:
        chat_id = chat_exists[0].get("chat_id")

        new_chat_query = """
            UPDATE chat_member
            SET is_removed = 0,
                left_at = NULL
            WHERE chat_id = %s
            AND is_removed = 1
        """
        toggle_chat_status = execute_db(new_chat_query, (chat_id,))
        if toggle_chat_status == "error":
            return {"error": "Something went wrong"}, 400
        
        # refresh UI
        user_chats = get_chats(current_user_id)

        socketIO.emit(
            "update_all_chats",
            {
                "user_id": current_user_id,
                "user_chats": user_chats
            },
            room=f"user_{current_user_id}"
        )
        
        return {"success": "Chat restored",
                "chat_id": chat_id,
                "user_chats": user_chats}
    
    # chat does not exist
    if not chat_exists:
        new_chat_query = """
            INSERT INTO chat(created_by, type, is_deleted)
            VALUES (%s, 'Private', 0)
        """

        chat_id = execute_db(new_chat_query, (current_user_id,))

        if chat_id == "error":
            return {"error": "Something went wrong"}, 400

        add_member_query = """
            INSERT INTO chat_member(user_id, chat_id, role, is_removed)
            VALUES
                (%s, %s, 'Member', 0),
                (%s, %s, 'Member', 0)
        """
        add_member = execute_db(add_member_query, 
        (current_user_id, chat_id, selected_user_id, chat_id))

        if add_member == "error":
            return {"error": "Something went wrong"}, 400
        
        # refresh UI
        user_chats = get_chats(current_user_id)

        socketIO.emit(
            "update_all_chats",
            {
                "user_id": current_user_id,
                "user_chats": user_chats
            },
            room=f"user_{current_user_id}"
        )
        
        return {"success": "New chat added",
                "chat_id": chat_id,
                "user_chats": user_chats}


# load a specific chat info (chat_icon, username/group name, group type)
@chat_bp.route("/load-chat-info", methods=["POST"])
def load_chat_info():
    data = request.get_json()
    chat_id = data.get("chatID")
    user_id = data.get("userID")

    chat_data = query_db("SELECT type, name, community_id FROM chat WHERE chat_id = %s", (chat_id,))
    if chat_data == "error":
        return {"error": "Something went wrong"}, 400
    
    chat_type = chat_data[0].get("type")
    group_name = chat_data[0].get("name")
    community_id = chat_data[0].get("community_id")

    if chat_type == "Group":
        user_data = query_db("SELECT role, is_removed FROM chat_member WHERE chat_id = %s AND user_id = %s", (chat_id, user_id))

        if user_data == "error":
            return {"error": "Something went wrong"}, 400
        
        if not user_data:
            return {"error": "User not found in chat"}, 404
        
        user_role = user_data[0].get("role")
        is_removed = user_data[0].get("is_removed")


        if community_id and user_role == "Admin":
            return {
                "chat_info": {
                    "chat_icon": "",
                    "chat_type": "Group",
                    "chat_name": group_name,
                    "user_role": "Community Admin",
                    "is_removed": is_removed,
                    "community_id": community_id
                }
        }
        
        return {
            "chat_info": {
                "chat_icon": "",
                "chat_type": "Group",
                "chat_name": group_name,
                "is_removed": is_removed,
                "user_role": user_role
            }
        }
    
    if chat_type == "Private":
        user_data = query_db("SELECT user_id FROM chat_member WHERE chat_id = %s AND user_id != %s",
                            (chat_id, user_id))
        
        if user_data == "error":
            return {"error": "Something went wrong"}, 400

        user_id = user_data[0].get("user_id")
        chat_data = query_db("SELECT profile_pic, username FROM user WHERE user_id = %s", (user_id,))

        if chat_data == "error":
            return {"error": "Something went wrong"}, 400
        
        chat_icon = chat_data[0].get("profile_pic")
        chat_name = chat_data[0].get("username")
        
        return {
            "chat_info": {
                "chat_type": "Private",
                "chat_icon": chat_icon,
                "chat_name": chat_name
            }
        }
    

# load other users that are not in the group (for normal group chats)
@chat_bp.route("/load-not-in-group-users", methods=["POST"])
def load_not_in_group_users():
    data = request.get_json()

    chat_id = data.get("chatID")

    query = """
        SELECT user_id, username, profile_pic
        FROM user
        WHERE role = 'User'
        AND user_id NOT IN (
            SELECT user_id
            FROM chat_member
            WHERE chat_id = %s
            AND is_removed = 0
        )
    """
    other_users = query_db(query, (chat_id,))

    if other_users == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"other_users": other_users}


# load other community members that are not in the group (for community group chats)
@chat_bp.route("/load-not-in-group-members", methods=["POST"])
def load_not_in_group_members():
    data = request.get_json()

    chat_id = data.get("chatID")
    community_id = data.get("communityID")

    query = """
        SELECT user.user_id, user.username, user.profile_pic
        FROM user
        JOIN community_member
            ON user.user_id = community_member.user_id
        LEFT JOIN chat_member
            ON community_member.user_id = chat_member.user_id
            AND chat_member.chat_id = %s
        WHERE community_member.community_id = %s
        AND (
            chat_member.user_id IS NULL
            OR chat_member.is_removed = 1
        )
    """
    other_members = query_db(query, (community_id, chat_id))
    if other_members == "error": 
        return {"error": "Something went wrong"}, 400
    
    return {"other_members": other_members}


# add new members into group
@chat_bp.route("/add-group-members", methods=["POST"])
def add_group_members():
    data = request.get_json()

    chat_id = data.get("chatID")
    selected_users = data.get("selectedUsers")

    for user in selected_users:
        user_id = user.get("userID")

        check_is_removed = query_db("SELECT is_removed FROM chat_member WHERE user_id = %s AND chat_id = %s", (user_id, chat_id))

        if check_is_removed == "error":
            return {"error": "Something went wrong"}, 400
        
        if check_is_removed and check_is_removed[0].get("is_removed") == 1:
            add_member_query = """
                UPDATE chat_member 
                SET is_removed = 0, 
                    join_at = NOW(),
                    left_at = NULL
                WHERE user_id = %s 
                AND chat_id = %s
            """

            add_member = execute_db(add_member_query, (user_id, chat_id))

            if add_member == "error":
                return {"error": "Something went wrong"}, 400

            user_chats = get_chats(user_id)

            socketIO.emit(
                "update_all_chats",
                {
                    "user_id": user_id,
                    "user_chats": user_chats
                },
                room=f"user_{user_id}"
            )

            socketIO.emit(
                "added_to_chat",
                {
                    "chatID": chat_id
                },
                room=f"user_{user_id}"
            )

            continue

        query = """
            INSERT INTO chat_member(user_id, chat_id, role, join_at, is_removed)
            VALUES (%s, %s, 'Member', NOW(), 0)
        """

        add_member = execute_db(query, (user_id, chat_id))
        if add_member == "error":
            return {"error": "Something went wrong"}, 400
        
        user_chats = get_chats(user_id)

        socketIO.emit(
            "update_all_chats",
            {
                "user_id": user_id,
                "user_chats": user_chats
            },
            room=f"user_{user_id}"
        )
        
    return {"success": "New members added!"}    


# load existing members in a group chat
@chat_bp.route("/load-existing-members", methods=["POST"])
def load_existing_members():
    data = request.get_json()

    chat_id = data.get("chatID")

    query = """
        SELECT user.user_id, user.username, user.profile_pic
        FROM user
        JOIN chat_member
        ON user.user_id = chat_member.user_id
        WHERE chat_member.chat_id = %s
        AND chat_member.is_removed = 0
        AND chat_member.role = 'Member'
        ORDER BY user.username
    """
    existing_members = query_db(query, (chat_id,))

    if existing_members == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"existing_members": existing_members}
        

# delete selected members from group chat
@chat_bp.route("/delete-members", methods=["POST"])
def delete_members():
    data = request.get_json()

    selected_members = data.get("selectedDeleteMembers")
    chat_id = data.get("chatID")

    for member in selected_members:
        user_id = member.get("user_id")

        query = """
            UPDATE chat_member
            SET is_removed = 1, left_at = NOW()
            WHERE user_id = %s AND chat_id = %s
        """

        delete_member = execute_db(query, (user_id, chat_id))
        if delete_member == "error":
            return {"error": "Something went wrong"}, 400
        
        socketIO.emit(
            "removed_from_chat",
            {
                "chatID": chat_id
            },
            room=f"user_{user_id}"
        )

        user_chats = get_chats(user_id)

        socketIO.emit(
            "update_all_chats",
            {
                "user_id": user_id,
                "user_chats": user_chats
            },
            room=f"user_{user_id}"
        )
        
    return {"success": "Selected users have been removed"}


# delete group chat
@chat_bp.route("/delete-group-chat", methods=["POST"])
def delete_group_chat():
    data = request.get_json()

    user_id = data.get("userID")
    chat_id = data.get("chatID")

    # Get active members before deleting them so we can update their UI
    member_ids = get_member_ids(chat_id)

    # soft delete the group
    delete_group_query = """
        UPDATE chat
        SET is_deleted = 1
        WHERE chat_id = %s
    """
    delete_group = execute_db(delete_group_query, (chat_id,))
    if delete_group == "error":
        return {"error": "Something went wrong"}, 400
    
    # delete admin
    delete_admin_query = """
        DELETE FROM chat_member
        WHERE user_id = %s
        AND chat_id = %s
    """
    delete_admin = execute_db(delete_admin_query, (user_id, chat_id))
    if delete_admin == "error":
        return {"error": "Something went wrong"}, 400

    # soft delete all the members
    delete_member_query = """
        UPDATE chat_member
        SET is_removed = 1,
            left_at = NOW()
        WHERE chat_id = %s
    """
    delete_member = execute_db(delete_member_query, (chat_id,))
    if delete_member == "error":
        return {"error": "Something went wrong"}, 400
    

    socketIO.emit(
        "group_deleted",
        {"chatID": chat_id},
        room=f"chat_{chat_id}"
    )

    for member in member_ids:
        member_id = member.get("user_id")

        if int(member_id) == int(user_id):
            continue

        # refresh UI for other members
        member_chats = get_chats(member_id)

        socketIO.emit(
            "update_all_chats",
            {
                "user_id": member_id,
                "user_chats": member_chats
            },
            room=f"user_{member_id}"
        )
    
    admin_chats = get_chats(user_id)
    return {"success": "Group chat deleted",
            "user_chats": admin_chats}


# exit a group chat
@chat_bp.route("/exit-group-chat", methods=["POST"])
def exit_group_chat():
    data = request.get_json()

    user_id = data.get("userID")
    chat_id = data.get("chatID")

    query = """
        DELETE FROM chat_member
        WHERE user_id = %s
        AND chat_id = %s
    """

    exit_group  = execute_db(query, (user_id, chat_id))
    if exit_group == "error":
        return {"error": "Something went wrong"}, 400
    
    socketIO.emit(
        "removed_from_chat",
        {
            "chatID": chat_id
        },
        room=f"user_{user_id}"
    )

    # refresh UI
    user_chats = get_chats(user_id)

    socketIO.emit(
        "update_all_chats",
        {
            "user_id": user_id,
            "user_chats": user_chats
        },
        room=f"user_{user_id}"
    )
    
    return {"success": "You have left the group chat",
            "user_chats": user_chats}


# delete a private chat
@chat_bp.route("/delete-private-chat", methods=["POST"])
def delete_private_chat():
    data  = request.get_json()

    user_id = data.get("userID")
    chat_id = data.get("chatID")

    query = """
        UPDATE chat_member
        SET is_removed = 1,
            left_at = NOW()
        WHERE user_id = %s
        AND chat_id = %s
    """

    delete_chat = execute_db(query, (user_id, chat_id))
    if delete_chat == "error":
        return {"error": "Something went wrong"}, 400
    
    # refresh UI
    user_chats = get_chats(user_id)

    socketIO.emit(
        "update_all_chats",
        {
            "user_id": user_id,
            "user_chats": user_chats
        },
        room=f"user_{user_id}"
    )
    
    return {"success": "Chat deleted",
            "user_chats": user_chats}


# load messages
@chat_bp.route("/load-messages", methods=["POST"])
def load_messages():
    data = request.get_json()

    if not data:
        return {"error": "Invalid request body"}, 400

    user_id = data.get("userID")
    chat_id = data.get("chatID")
    oldest_message_id = data.get("oldestMessageID")

    # first time load messages
    if not oldest_message_id:
        query = """
            SELECT user.user_id, user.username, user.profile_pic, message.message_id, message.chat_id, message.message_text, 
            message.attachment_url, message.attachment_type, message.file_name, message.sent_at
            FROM user
            JOIN message ON user.user_id = message.sender_id
            JOIN chat_member
                ON chat_member.chat_id = message.chat_id
                AND chat_member.user_id = %s
            WHERE message.chat_id = %s
            AND message.sent_at >= chat_member.join_at
            AND (
                chat_member.left_at IS NULL
                OR message.sent_at <= chat_member.left_at
            )
            ORDER BY message.sent_at DESC
            LIMIT 30
        """
        messages_data = query_db(query, (user_id, chat_id))
        if messages_data == "error":
            return {"error": "Something went wrong"}, 400
        
        messages = []
        for message in messages_data:
            messages.append({
                "user_id": message.get("user_id"),
                "username": message.get("username"),
                "profile_pic": message.get("profile_pic"),
                "message_id": message.get("message_id"),
                "chat_id": message.get("chat_id"),
                "message": message.get("message_text"),
                "attachment_url": message.get("attachment_url"),
                "attachment_type": message.get("attachment_type"),
                "file_name": message.get("file_name"),
                "date": message.get("sent_at").strftime("%d/%m/%Y"),
                "time": message.get("sent_at").strftime("%I:%M %p"),
                "sent_at": message.get("sent_at")
            })

        return {"messages": messages}
    
    query = """
        SELECT user.user_id, user.username, user.profile_pic, message.message_id, message.chat_id, message.message_text, 
        message.attachment_url, message.attachment_type, message.file_name, message.sent_at
        FROM user
        JOIN message ON user.user_id = message.sender_id
        JOIN chat_member
            ON chat_member.chat_id = message.chat_id
            AND chat_member.user_id = %s
        WHERE message.chat_id = %s
        AND message.sent_at < (
            SELECT sent_at FROM message WHERE message_id = %s
        )
        AND (
            chat_member.left_at IS NULL
            OR message.sent_at <= chat_member.left_at
        )
        ORDER BY message.sent_at DESC
        LIMIT 30
    """
    messages_data = query_db(query, (user_id, chat_id, oldest_message_id))
    if messages_data == "error":
            return {"error": "Something went wrong"}, 400
    
    messages = []
    for message in messages_data:
        messages.append({
            "user_id": message.get("user_id"),
            "username": message.get("username"),
            "profile_pic": message.get("profile_pic"),
            "message_id": message.get("message_id"),
            "chat_id": message.get("chat_id"),
            "message": message.get("message_text"),
            "attachment_url": message.get("attachment_url"),
            "attachment_type": message.get("attachment_type"),
            "file_name": message.get("file_name"),
            "date": message.get("sent_at").strftime("%d/%m/%Y"),
            "time": message.get("sent_at").strftime("%I:%M %p")
        })

    return {"messages": messages}


# get group members' chat IDs
def get_member_ids(chat_id):
    member_ids = query_db("SELECT user_id FROM chat_member WHERE chat_id = %s AND is_removed = 0", (chat_id,))
    
    if member_ids == "error":
        return []
    
    return member_ids

# send message
@chat_bp.route("/send-message", methods=["POST"])
def send_message():
    user_id = request.form.get("userID")
    chat_id = request.form.get("chatID")
    chat_type = request.form.get("chatType")

    member_check = query_db("""
        SELECT is_removed
        FROM chat_member
        WHERE user_id = %s
        AND chat_id = %s
    """, (user_id, chat_id))

    if not member_check or member_check[0].get("is_removed") == 1:
        return {"error": "You are no longer in this chat"}, 403

    message = request.form.get("message") or ""

    file = request.files.get("file")

    original_file_name = None
    file_url = None
    file_type = None
    saved_file_name = None

    save_message_query = """
        INSERT INTO message(sender_id, chat_id, message_text)
        VALUES(%s, %s, %s)
    """
    message_id = execute_db(save_message_query, (user_id, chat_id, message))
    if message_id == "error":
        return {"error": "Something went wrong"}, 400
    
    if file:
        try:
            if file.content_type and file.content_type.startswith("image/"):
                file_type = "Image"
            
            elif file.content_type and file.content_type.startswith("video/"):
                file_type = "Video"

            else:
                file_type = "Document"

            original_file_name = secure_filename(file.filename)

            save_path = os.path.join(UPLOAD_ROOT, "chat_attachments")
            os.makedirs(save_path, exist_ok=True)

            file_ext = os.path.splitext(original_file_name)[1]
            saved_file_name = f"{message_id}{file_ext}"
            file.save(os.path.join(save_path, saved_file_name))

            file_url = f"/uploads/chat_attachments/{saved_file_name}"
        
        except Exception as e:
            return {"error": "Failed to save attachment file"}, 400
        
        add_attachment_url = execute_db(
            """UPDATE message 
            SET attachment_url = %s ,
            file_name = %s,
            attachment_type = %s
            WHERE message_id = %s""", 
            (file_url, original_file_name, file_type, message_id)
        )
        
        if add_attachment_url == "error":
            return {"error": "Something went wrong"}, 400
    
    chat_member_ids = get_member_ids(chat_id)

    for member in chat_member_ids:
        member_id = member.get("user_id")

        is_read = 1 if int(member_id) == int(user_id) else 0

        message_status_query = """
            INSERT INTO message_status(message_id, user_id, is_read)
            VALUES(%s, %s, %s)
        """
        
        add_status = execute_db(message_status_query, (message_id, member_id, is_read))
        if add_status == "error":
            return {"error": "Something went wrong"}, 400
        
    # if chat is private, check if another user has deleted the chat, if yes restore
    if chat_type == "Private":
        restore_chat_query = """
            UPDATE chat_member 
            SET is_removed = 0, 
                left_at = NULL 
            WHERE chat_id = %s
            AND user_id != %s
            AND is_removed = 1
        """
        restore_chat = execute_db(restore_chat_query, (chat_id, user_id))
        if restore_chat == "error":
            return {"error": "Something went wrong"}, 400

    msg_info_query = """
        SELECT message.chat_id, message.sent_at
        FROM message
        WHERE message_id = %s
    """
    message_data = query_db(msg_info_query, (message_id,))
    if message_data == "error":
        return {"error": "Something went wrong"}, 400
    
    sender_query = """
        SELECT username, profile_pic
        FROM user
        WHERE user_id = %s
    """
    sender_data = query_db(sender_query, (user_id,))

    sender_username = sender_data[0].get("username")
    sender_profile_pic = sender_data[0].get("profile_pic")
    
    message_info = {
        "user_id": user_id,
        "username": sender_username,
        "profile_pic": sender_profile_pic,
        "message_id": message_id,
        "chat_id": chat_id,
        "message": message,
        "attachment_url": file_url,
        "attachment_type": file_type,
        "file_name": original_file_name,
        "date": message_data[0].get("sent_at").strftime("%d/%m/%Y"),
        "time": message_data[0].get("sent_at").strftime("%I:%M %p")
    }

    # update new message
    socketIO.emit(
        "receive_message",
        message_info,
        room=f"chat_{chat_id}"
    )

    # refresh UI
    sender_chats = get_chats(user_id)

    socketIO.emit(
        "update_all_chats",
        {
            "user_id": user_id,
            "user_chats": sender_chats
        },
        room=f"user_{user_id}"
    )

    member_ids = query_db("""
        SELECT user_id 
        FROM chat_member 
        WHERE chat_id = %s 
        AND is_removed = 0
    """, (chat_id,))

    if not member_ids or member_ids == "error":
        return {"error": "No chat members found"}, 400
    
    print("DEBUG member_ids:", member_ids)

    for member in member_ids:
        member_id = member.get("user_id")

        if int(member_id) == int(user_id):
            continue

        # update chats
        recipient_chats = get_chats(member_id)

        socketIO.emit(
            "update_all_chats",
            {"user_id": member_id, "user_chats": recipient_chats},
            room=f"user_{member_id}"
        )

        # update unread (KEEP but consider batching later)
        unread_data = query_db("""
            SELECT COUNT(DISTINCT message.message_id) AS total_unread_count
            FROM message
            JOIN message_status
            ON message.message_id = message_status.message_id
            JOIN chat
            ON chat.chat_id = message.chat_id
            JOIN chat_member
            ON chat_member.chat_id = chat.chat_id
            WHERE chat_member.user_id = %s
            AND message_status.user_id = %s
            AND message_status.is_read = 0
            AND chat.is_deleted = 0
        """, (member_id, member_id))

        socketIO.emit(
            "update_unread_count",
            {
                "user_id": member_id,
                "count": unread_data[0].get("total_unread_count")
            },
            room=f"user_{member_id}"
        )

    return {"message_info": message_info,
            "user_chats": sender_chats}


@chat_bp.route("/uploads/profile_pics/<path:filename>")
def uploaded_profile_pics(filename):
    return send_from_directory(
        os.path.join(UPLOAD_ROOT, "profile_pics"),
        filename
    )

@chat_bp.route("/uploads/chat_attachments/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(
        os.path.join(UPLOAD_ROOT, "chat_attachments"),
        filename
    )

# read all messages in the chat when user clicks on it
@chat_bp.route("/read-all-messages", methods=["POST"])
def read_all_messages():
    data = request.get_json()

    user_id = data.get("userID")
    chat_id = data.get("chatID")

    read_msg_query = """
        UPDATE message_status
        JOIN message
        ON message_status.message_id = message.message_id
        SET message_status.is_read = 1
        WHERE message_status.user_id = %s
        AND message.chat_id = %s
    """
    read_messages = execute_db(read_msg_query, (user_id, chat_id))
    if read_messages == "error":
        return {"error": "Something went wrong"}, 400
    
    # refresh UI
    user_chats = get_chats(user_id)

    socketIO.emit(
        "update_all_chats",
        {
            "user_id": user_id,
            "user_chats": user_chats
        },
        room=f"user_{user_id}"
    )

    unread_query = """
        SELECT COUNT(message.message_id) AS total_unread_count
        FROM message
        JOIN message_status
        ON message.message_id = message_status.message_id
        JOIN chat
        ON chat.chat_id = message.chat_id
        JOIN chat_member
        ON chat_member.chat_id = chat.chat_id
        WHERE chat_member.user_id = %s
        AND message_status.user_id = %s
        AND message_status.is_read = 0
        AND chat.is_deleted = 0
    """
    unread_data = query_db(unread_query, (user_id, user_id))
    total_unread_count = unread_data[0]["total_unread_count"]

    socketIO.emit(
        "update_unread_count",
        {
            "user_id": user_id,
            "count": total_unread_count
        },
        room=f"user_{user_id}"
    )
    
    return {"success": True,
            "user_chats": user_chats}


# open a private chat when user clicks message button in other user's profile
@chat_bp.route("/open-private-chat", methods=["POST"])
def open_private_chat():
    data = request.get_json()

    current_user_id = data.get("currentUserID")
    user_id = data.get("userID")

    chat_exists_query = """
        SELECT chat.chat_id
        FROM chat
        JOIN chat_member cm1 ON chat.chat_id = cm1.chat_id
        JOIN chat_member cm2 ON chat.chat_id = cm2.chat_id
        WHERE chat.type = 'Private'
        AND cm1.user_id = %s
        AND cm2.user_id = %s
    """
    chat_id = query_db(chat_exists_query, (current_user_id, user_id))
    if chat_id == "error":
        return {"error": "Something went wrong"}, 400
    
    if chat_id:
        chat_id = chat_id[0].get("chat_id")
        # if chat exists, update is_removed status of the users for the chat
        update_chat_query = """
            UPDATE chat_member
            SET is_removed = 0
            WHERE chat_id = %s
        """
        update_chat_status = execute_db(update_chat_query, (chat_id,))
        if update_chat_status == "error":
            return {"error": "Something went wrong"}, 400
        
        return {"chat_id": chat_id}
    
    # if chat does not exist, create new chat
    new_chat_query = """
        INSERT INTO chat(created_by, type, is_deleted)
        VALUES(%s, 'Private', 0)
    """
    new_chat_id =  execute_db(new_chat_query, (current_user_id,))
    if new_chat_id == "error":
        return {"error": "Something went wrong"}, 400
    
    # add users into chat member table
    add_chat_member_query = """
        INSERT INTO chat_member(user_id, chat_id, role, is_removed)
        VALUES
        (%s, %s, 'Admin', 0),
        (%s, %s, 'Member', 0)
    """
    add_chat_member = execute_db(add_chat_member_query, (current_user_id, new_chat_id, user_id, new_chat_id))
    if add_chat_member == "error":
        return {"error": "Something went wrong"}, 400
    
    return {"chat_id": new_chat_id}