from flask import Blueprint, request
from extensions import query_db, calculate_age

find_player_bp = Blueprint("find-player", __name__)

def get_sport_name(sport_id):
    sport_data = query_db("SELECT name FROM sport_category WHERE category_id = %s", (sport_id,))

    if sport_data == "error":
        return "error"
    
    sport_name = sport_data[0].get("name")
    
    return sport_name

def get_skill_level_name(skill_level_id):
    skill_level_data = query_db("SELECT name FROM skill_level WHERE skill_level_id = %s", (skill_level_id,))

    if skill_level_data == "error":
        return "error"
    
    skill_level_name = skill_level_data[0].get("name")

    return skill_level_name

# calculates the match percentage
def calculate_user_score(gender, age_group, sport, skill_level, user_id, user_gender, user_age):
    score = 0
    
    if gender == user_gender:
        score += 5

    age_group_data = query_db("SELECT * FROM age_group WHERE group_id = %s", (age_group,))

    if age_group_data == "error" or not age_group_data:
        return "error"
    
    age_group = age_group_data[0]
    if age_group.get("is_deleted") == 1:
        return "error"
    
    age_from = age_group.get("age_from")
    to_age = age_group.get("to_age")

    if age_from <= user_age <= to_age:
        score += 10

    user_sport_data = query_db("SELECT * FROM user_detail WHERE user_id = %s", (user_id,))

    if user_sport_data == "error":
        return "error"
    
    matched_sport = ""
    matched_skill_level = ""

    for user_sport in user_sport_data:
        matched = False

        if user_sport.get("sport") == sport:
            score += 15

            matched_sport = get_sport_name(sport)
            if matched_sport == "error":
                return "error"

            matched = True

        if user_sport.get("sport") == sport and user_sport.get("skill_level") == skill_level:
            score += 20
            
            matched_skill_level = get_skill_level_name(skill_level)
            if matched_skill_level == "error":
                return "error"

        if matched:
            break

    score_percentage = score / 50 * 100

    return {
        "score": score_percentage,
        "matched_sport": matched_sport,
        "matched_skill_level": matched_skill_level
    }


# find the best matched player
@find_player_bp.route("", methods=["POST"])
def match_player():
    data = request.get_json()

    user_id = data.get("userID")
    gender = data.get("gender")
    age_group = data.get("ageGroup")
    sport = data.get("sport")
    skill_level = data.get("skillLevel")

    user_scores = []

    users = query_db("SELECT * FROM user WHERE user_id != %s AND role = 'User'",
                    (user_id,))
    
    if users == "error":
        return {"error": "Failed to fetch user data"}, 400

    for user in users:
        target_user_id = user.get("user_id")
        username = user.get("username")
        user_gender = user.get("gender")

        user_birthdate = user.get("birthdate")
        user_age = calculate_age(user_birthdate)

        result = calculate_user_score(gender, age_group, sport, skill_level, 
                                    target_user_id, user_gender, user_age)
        
        if result == "error":
            return {"error": "Something went wrong"}, 400
        
        score_percentage = result["score"]
        matched_sport = result["matched_sport"]
        matched_skill_level = result["matched_skill_level"]
        
        user_scores.append({"user_id": target_user_id,
                            "username": username,
                            "score": score_percentage,
                            "gender": user_gender,
                            "age": user_age,
                            "matched_sport": matched_sport,
                            "matched_skill_level": matched_skill_level})
        
    sorted_users = sorted(
        user_scores,
        key=lambda u: u["score"],
        reverse=True
    )

    return {"matched_player": sorted_users[0]}
    