from flask_mail import Mail
from flask_mysqldb import MySQL
import MySQLdb.cursors
from datetime import date, datetime
from flask_socketio import SocketIO


mail = Mail()
mysql = MySQL()
socketIO = SocketIO(cors_allowed_origins="*")


# fetch data from database
def query_db(query, args=(), one=False):
    cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)

    try:
        cursor.execute(query, args)
        if one:
            data = cursor.fetchone()
        else:
            data = cursor.fetchall()
        return data
    except Exception as e:
        print("DB ERROR:", e)
        return "error"
    finally:
        cursor.close()


# saves data into database and get the last ID
def execute_db(query, args=()):
    cursor = mysql.connection.cursor()

    try:
        cursor.execute(query, args)
        mysql.connection.commit()

        lastID = cursor.lastrowid
        return lastID
    
    except Exception as e:
        mysql.connection.rollback()
        print("DB ERROR:", e)
        return "error"
    finally:
        cursor.close()


# calculates user's age
def calculate_age(user_birthdate):

    print("DEBUG birthdate:", user_birthdate, type(user_birthdate))

    # convert string → date if needed
    if isinstance(user_birthdate, str):
        user_birthdate = datetime.strptime(user_birthdate, "%Y-%m-%d").date()

    today = date.today()

    age = today.year - user_birthdate.year

    # check if birthday has happened this year
    if (today.month, today.day) < (user_birthdate.month, user_birthdate.day):
        age -= 1

    return age