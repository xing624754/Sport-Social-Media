from flask import Blueprint, request
from extensions import query_db, execute_db
import re

equipment_bp = Blueprint("equipment", __name__)

MAX_NUMBER = 30

@equipment_bp.route("/load-equipments", methods=["POST"])
def load_equipments():
    data = request.get_json()
    selected = data.get("selected")
    user_id = data.get("userID")

    if(selected == "Recommended"):
        equipments = recommend_equipment(user_id)
        return {"equipments": equipments}

    #  return all equipments from DB to frontend 
    equipments = query_db("""
        SELECT equipment_id, name, description, price, brand, rating, product_url, image_url, source
        FROM equipment
        WHERE sport_category = %s
        ORDER BY created_at DESC
    """, (selected,))

    if equipments == "error":
        return {"error": "Something went wrong"}, 400

    return {"equipments": equipments}


# recommend equipments to user
def recommend_equipment(user_id):

    # get user's preferred sports
    get_sport_ids = query_db("""
        SELECT sport 
        FROM user_detail
        WHERE user_id = %s
    """, (user_id,))

    if get_sport_ids == "error" or not get_sport_ids:
        return []
    
    sport_ids = [
        sport_id.get("sport")
        for sport_id in get_sport_ids
    ]

    placeholders = ",".join(["%s"] * len(sport_ids))

    # fetch equipments
    equipments = query_db(f"""
        SELECT *
        FROM equipment
        WHERE sport_category IN ({placeholders})
    """, tuple(sport_ids))

    if equipments == "error":
        return []
    

    # AI scoring
    for equipment in equipments:
        
        score = 0

        # higher rating = better
        rating = equipment.get("rating") or 0
        score += rating * 2

        # cheaper products add score
        price = extract_price(equipment.get("price"))

        if price and price < 200:
            score += 2

        equipment["ai_score"] = score

    equipments = list(equipments)

    # sort highest score first
    equipments.sort(
        key=lambda x: x["ai_score"],
        reverse=True
    )        

    return equipments[:30]


# extract price from equipment price (string -> float)
def extract_price(price_text):

    if not price_text:
        return None
    
    numbers = re.findall(r"\d+\.?\d*", str(price_text))

    if not numbers:
        return None
    
    return float(numbers[0])


# updates data using scheduler
def update_all_equipments():
    sports = query_db("""
        SELECT category_id, name
        FROM sport_category
        WHERE is_deleted = 0
    """)

    if sports == "error":
        return
    
    for sport in sports:

        sport_id = sport.get("category_id")
        sport_name = sport.get("name")

        # delete old equipments
        delete_old_data = execute_db("""
            DELETE FROM equipment
            WHERE sport_category = %s
            AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (sport_id,))

        if delete_old_data == "error":
            continue

        # count remaining
        count_row = query_db("""
            SELECT COUNT(*) AS total
            FROM equipment
            WHERE sport_category = %s
        """, (sport_id,))

        if count_row == "error":
            continue
        
        current_total = count_row[0].get("total")

        if current_total < MAX_NUMBER:
            needed = MAX_NUMBER - current_total

            new_equipments = fetch_data(sport_name, needed)

            if not save_data(new_equipments, sport_id):
                print("Failed to update equipments")


from serpapi_service import search_google_shopping

# fetch data from serp API
def fetch_data(sport_name, no_of_needed):
    query = f"{sport_name} sports equipment"

    return search_google_shopping(query, no_of_needed)


# helper: save new data to equipment table
def save_data(equipments, sport_id):
    for equipment in equipments:

        # skip if already in DB (avoid duplicates)
        existing = query_db(
            "SELECT product_id FROM equipment WHERE product_id = %s",
            (equipment["product_id"],)
        )
        if existing == "error":
            return False
        
        if existing:
            continue

        save_equipment = execute_db("""
            INSERT INTO equipment
                (sport_category, product_id, name, description, price, brand, rating, product_url, image_url, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            sport_id,
            equipment.get("product_id"),
            equipment.get("name"),
            equipment.get("description"),
            equipment.get("price"),
            equipment.get("brand"),
            equipment.get("rating"),
            equipment.get("product_url") or "N/A", 
            equipment.get("image_url"),
            equipment.get("source")
        ))

        if save_equipment == "error":
            return False
        
    return True