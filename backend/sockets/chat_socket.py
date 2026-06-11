from flask_socketio import join_room, leave_room
from flask import request
from extensions import socketIO

@socketIO.on("join_user")
def join_user_room(data):
    print("JOIN USER EVENT RECEIVED:", data)

    if not data or "userID" not in data:
        print("INVALID join_user payload")
        return

    user_id = data["userID"]

    print("JOINING ROOM:", user_id)

    join_room(f"user_{user_id}")

@socketIO.on("leave_user")
def leave_user_room(data):
    user_id = data["userID"]
    leave_room(f"user_{user_id}")

@socketIO.on("join_chat")
def join_chat_room(data):
    chat_id = data["chatID"]
    join_room(f"chat_{chat_id}")
    print(f"{request.sid} joined chat_{chat_id}")

@socketIO.on("leave_chat")
def leave_chat(data):
    chat_id = data["chatID"]
    leave_room(f"chat_{chat_id}")

@socketIO.on("connect")
def connect(auth=None):
    print("CONNECTED SID:", request.sid)
    print("AUTH:", auth)

@socketIO.on("disconnect")
def disconnect():
    print("DISCONNECTED:", request.sid)