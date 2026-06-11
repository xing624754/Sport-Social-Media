from flask import request, session, Blueprint, current_app
from extensions import query_db, execute_db, mail
from werkzeug.security import check_password_hash, generate_password_hash
from flask_mail import Message
from itsdangerous import BadSignature, SignatureExpired
import re
from datetime import datetime, timezone, date

auth_bp = Blueprint("auth", __name__)

# checks if user is logged in
@auth_bp.route("/check-session")
def check_session():
    if "user_id" not in session:
        return {"loggedIn": False}, 200
    
    return {"loggedIn": True,
            "user_id": session["user_id"],
            "role": session["role"]}, 200


# login logic
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    if not data:
        return {"error": "Invalid request"}, 400

    username = data.get("username")
    password = data.get("password")
    remember = data.get("remember", False)

    if not username or not password:
        return {"error": "Missing credentials"}, 400

    users = query_db(
        "SELECT user_id, username, password, role, status, freeze_until FROM user WHERE username = %s", 
        (username,)
    )

    if users == "error":
        return {"error": "Something went wrong"}, 400

    if not users:
        return {"error": "Invalid username or password"}, 400
    
    user = users[0]
    user_id = user.get("user_id")
    
    if not check_password_hash(user.get("password"), password):
        return {"error": "Invalid username or password"}, 400
    
    if user.get("status") == "Deleted":
            return {"error": "Account is deleted"}, 400
    
    if user.get("freeze_until"):
        freeze_until = user.get("freeze_until")

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
                return {
                    "error": "Account is frozen"
                }, 403

        # freeze expired -> auto unfreeze
        execute_db("""
            UPDATE user
            SET
                status='Active',
                freeze_until=NULL
            WHERE user_id=%s
        """, (user_id,))

    session.clear()

    # creates session
    session.permanent = bool(remember)
    session["user_id"] = user_id
    session["username"] = user.get("username")
    session["role"] = user.get("role")

    return {"message": "Login successful!",
            "role": user.get("role")
    }
    

# forgot password logic
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()

    email = data.get("email")

    if not email:
        return {"error": "Email required"}, 400
    
    serializer = current_app.serializer

    # generate a secure token (a special encoded string)
    token = serializer.dumps(email, salt="password-reset")
    reset_link = f"http://localhost:5173/reset-password/{token}"

    # send reset link via email
    msg = Message(
        subject="Sportify - Password Reset",
        sender="ecopoints16@gmail.com",
        recipients=[email]
    )
    msg.body = f"Click here to reset your password: {reset_link}\n\nALERT: Please reset your password within 30 minutes!"
    mail.send(msg)

    return {"message": "If this email exists, a reset link has been sent"}


# verifies if the token is valid or expired
def verify_token(token):
    try:

        serializer = current_app.serializer

        email = serializer.loads(
            token,
            salt="password-reset",
            max_age=1800   # 30 mins
        )
        return email
    
    except SignatureExpired:
        return None
    except BadSignature:
        return None


# checks if password is valid
def is_password_valid(password):
    if len(password) < 8:
        return False, "Password should contain at least 8 characters"
    
    # use regex to check if password contains at least one lowercase letter, uppercase letter, number and special character
    # also checks if password is empty
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$'

    if not re.match(pattern, password):
        return False, "Password must contain uppercase, lowercase, number, and special character"
    
    return True, ""


# reset password logic
@auth_bp.route("/reset-password/<token>", methods=["POST"])
def reset_password(token):
    email = verify_token(token)

    if not email:
        return {"error": "Invalid or expired link",
                "type": "Token invalid"}, 400
    
    data = request.get_json()
    new_password = data.get("password")
    confirm_password = data.get("confirmPassword")

    if not new_password or not confirm_password:
        return {"error": "Missing fields",
                "type": "Password error"}, 400

    # checks if both passwords match
    if new_password != confirm_password:
        return {"error": "Password does not match",
                "type": "Password error"}, 400
    
    # checks if password is valid
    valid_password, error_msg = is_password_valid(new_password)
    
    if not valid_password:
        return {"error": error_msg,
                "type": "Password invalid"}, 400
    
    hashed_password = generate_password_hash(new_password)

    execute_db(
        "UPDATE user SET password = %s WHERE email = %s",
        (hashed_password, email)
    )

    return {"message": "Password updated"}


# signup logic
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    email = data.get("email")
    birthdate = data.get("birthdate")
    username = data.get("username")
    password = data.get("password")
    gender = data.get("gender")
    selected_sports = data.get("selectedSports")

    if not email or not birthdate or not username or not password or not gender:
        return {"error": "Missing fields"}, 400
    
    if not selected_sports:
        return {"error": "Please select at least one sport"}, 400
    
    account_exist = query_db("SELECT * FROM user WHERE email = %s", (email,))
    
    if account_exist == "error":
        return{"error": "Something went wrong"}, 400
    
    # checks if account exists
    if account_exist:
        return {"error": "This email has been registered"}, 400
    
    same_username = query_db("SELECT * FROM user WHERE username = %s", (username,))
    
    if same_username == "error":
        return{"error": "Something went wrong"}, 400
    
    # checks if same username exists
    if same_username:
        return {"error": "Username exists"}, 400
    
    valid_password, error_msg = is_password_valid(password)

    if not valid_password:
        return{"error": error_msg,
                "type": "password invalid"}, 400

    hashed_password = generate_password_hash(password)

    query = """
    INSERT INTO user(role, username, password, status, gender, birthdate, email, profile_pic)
    VALUES('User', %s, %s, 'Active', %s, %s, %s, '/uploads/profile_pics/user.png')
    """
    user_id = execute_db(query, (username, hashed_password, gender, birthdate, email))

    if not user_id or user_id == "error":
        return{"error": "Something went wrong"}, 400
    
    for selected_sport in selected_sports:
        query = """
        INSERT INTO user_detail(user_id, sport, skill_level)
        VALUES(%s, %s, %s)
        """

        result = execute_db(query, (user_id, selected_sport.get("sportID"), selected_sport.get("skillLevelID")))

        if result == "error":
            return{"error": "Something went wrong"}, 400
        
    return {"success": "Account created successfully!"}

# logout logic
@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()

    return {"message": "Logged out successfully"}

    