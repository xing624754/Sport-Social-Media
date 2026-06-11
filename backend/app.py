

from flask import Flask
from flask_cors import CORS
from datetime import timedelta
from itsdangerous import URLSafeTimedSerializer
from dotenv import load_dotenv
from flask import send_from_directory
import os
from scheduler import start_scheduler
from sockets.chat_socket import *

from extensions import mail, mysql, socketIO

def create_app():
    # creates the main Flask app
    app = Flask(__name__)

    # database config
    app.config["MYSQL_HOST"] = "localhost"
    app.config["MYSQL_USER"] = "root"
    app.config["MYSQL_PASSWORD"] = ""
    app.config["MYSQL_DB"] = "sportify"
    mysql.init_app(app)

    load_dotenv()

    # secret key for sessions
    secret_key = os.getenv("SECRET_KEY")
    app.secret_key = secret_key
    serializer = URLSafeTimedSerializer(app.secret_key)
    app.serializer = serializer

    #session duration (for remember me)
    app.permanent_session_lifetime = timedelta(days=7)
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

    # allows React frontend to connect
    CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

    # mail config
    app.config["MAIL_SERVER"] = "smtp.gmail.com"
    app.config["MAIL_PORT"] = 587
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USERNAME"] = os.getenv("EMAIL")
    app.config["MAIL_PASSWORD"] = os.getenv("PASSWORD")
    mail.init_app(app)

    socketIO.init_app(app, async_mode="threading")
    # upload folder 
    BASE_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

    # create uploads folder if not exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # serve uploaded images
    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):

        return send_from_directory(
            app.config["UPLOAD_FOLDER"],
            filename
        )


    # register all blueprints
    from auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/auth")

    from get_categories import get_data_bp
    app.register_blueprint(get_data_bp, url_prefix="/api")

    from profile import profile_bp
    app.register_blueprint(profile_bp, url_prefix="/api")


    from find_player import find_player_bp
    app.register_blueprint(find_player_bp, url_prefix="/find-player")

    from manage_categories import categories_bp
    app.register_blueprint(categories_bp)
    
    from fit_guides import fit_guides_bp
    app.register_blueprint(fit_guides_bp, url_prefix="/api")

    from feedback import feedback_bp
    app.register_blueprint(feedback_bp, url_prefix="/api")

    from admin_feedback import admin_feedback_bp
    app.register_blueprint(admin_feedback_bp, url_prefix="/api")

    from home_feed import home_feed_bp
    app.register_blueprint(home_feed_bp, url_prefix="/api")

    from notification import notification_bp
    app.register_blueprint(notification_bp, url_prefix="/api")

    from people import people_bp
    app.register_blueprint(people_bp, url_prefix="/api")

    from report import report_bp
    app.register_blueprint(report_bp, url_prefix="/api")

    from announcement import announcement_bp
    app.register_blueprint(announcement_bp, url_prefix="/api")

    from post_interactions import post_interactions_bp
    app.register_blueprint(post_interactions_bp, url_prefix="/api")

    from community import community_bp
    app.register_blueprint(community_bp, url_prefix="/api")

    from advertisement import advertisement_bp
    app.register_blueprint(advertisement_bp, url_prefix="/api")

    from chat import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/chat")

    from post_review import review_bp
    app.register_blueprint(review_bp, url_prefix="/api")

    from activity_hosting import activity_hosting_bp
    app.register_blueprint(activity_hosting_bp, url_prefix="/api")

    from sports_community import sports_community_bp
    app.register_blueprint(sports_community_bp, url_prefix="/community")

    from equipment import equipment_bp
    app.register_blueprint(equipment_bp, url_prefix="/equipment")

    from admin import admin_bp
    app.register_blueprint(admin_bp)

    from createads import createads_bp
    app.register_blueprint(createads_bp, url_prefix="/api")

    from admin_profile import admin_profile_bp
    app.register_blueprint(admin_profile_bp, url_prefix="/api")

    from usermanagement import usermanagement_bp
    app.register_blueprint(usermanagement_bp, url_prefix="/api")

    from admin_notification import admin_notification_bp
    app.register_blueprint(admin_notification_bp, url_prefix="/api")

    from user_notification import user_notification_bp
    app.register_blueprint(user_notification_bp, url_prefix="/api")

    from posting import posting_bp
    app.register_blueprint(posting_bp)


    return app

    

app = create_app()

if __name__ == "__main__":

    # prevent running scheduler twice for debug mode
    start_scheduler(app)
    print("SCHEDULER STARTED")

    socketIO.run(
        app,
        debug=False,   
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
