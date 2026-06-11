from flask import Blueprint
from extensions import query_db

# get data from database

get_data_bp = Blueprint("api", __name__)

@get_data_bp.route("/age-group")
def get_age_group():
    data = query_db("SELECT * FROM age_group WHERE is_deleted = 0")

    if data == "error":
        return {"error": "Failed to fetch age group data"}
    
    return {"data": data}

@get_data_bp.route("/sport-category")
def get_sports():
    data = query_db("SELECT * FROM sport_category WHERE is_deleted = 0 ORDER BY name ASC")

    if data == "error":
        return {"error": "Failed to fetch sport category data"}
    
    return {"data": data}

@get_data_bp.route("/skill-level")
def get_skill_level():
    data = query_db("SELECT * FROM skill_level WHERE is_deleted = 0")

    if data == "error":
        return {"error": "Failed to fetch skill level data"}
    
    return {"data": data}
