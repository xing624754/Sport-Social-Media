
from flask import Blueprint, request, session
from extensions import query_db, execute_db

categories_bp = Blueprint("manage_categories", __name__)

@categories_bp.route("/age-group", methods = ["GET"])
def get_age_group():
    age_group = query_db("select * from age_group where is_deleted = 0")

    return {"age_group": age_group}

@categories_bp.route("/age-group", methods = ["PUT"])
def save_age_group():
    data = request.json

    age_group = data.get("age_group")

    if not age_group:
        return {"error": "Age Groups cannot be empty!"}, 400

    checked_groups = []

    for group in age_group:

        group_id = group.get("group_id")
        age_from = group.get("age_from")
        to_age = group.get("to_age")
        is_deleted = group.get("is_deleted")

        if is_deleted == 1:
            checked_groups.append({
                "group_id": group_id,
                "is_deleted": 1
            })
            continue

        if age_from in [None, ""] or to_age in [None, ""]:
            return {"error": "No empty fields are allowed!"}, 400

        age_from = int(age_from)
        to_age = int(to_age)

        if to_age < age_from:
            return {"error": "'Age From' cannot be greater than 'To Age'"}, 400

        checked_groups.append({
            "group_id": group_id,
            "age_from": age_from,
            "to_age": to_age,
            "is_deleted": 0
        })

    active_groups = [group for group in checked_groups if group.get("is_deleted") == 0]

    active_groups.sort(key = lambda x: x["age_from"])

    #check if got gap
    for i in range(len(active_groups) - 1):
        current = active_groups[i]
        next_group = active_groups[i + 1]

        if current["to_age"] + 1 != next_group["age_from"]:
            return {"error": f"No gaps are allowed between age groups\nGaps detected between {current['to_age']} and {next_group['age_from']}"}, 400

    #check if got overlap
    for i in range(len(active_groups)):
        for j in range(i + 1, len(active_groups)):
            a = active_groups[i]
            b = active_groups[j]

            if a["age_from"] <= b["to_age"] and a["to_age"] >= b["age_from"]:
                return {"error": "Overlapping ranges detected"}, 400


    # save if no error
    for group in checked_groups:

        #delete
        if group.get("is_deleted") == 1:
            if group.get("group_id") is not None:
                execute_db(
                    "update age_group set is_deleted = 1 where group_id = %s", (group["group_id"],)
                )

            continue

        if group.get("group_id") is None:
            execute_db(
                "insert into age_group (age_from, to_age, is_deleted) values (%s, %s, 0)", (group["age_from"], group["to_age"])
            )

        else:
            execute_db(
                """
                    update age_group
                    set age_from = %s, to_age = %s
                    where group_id = %s and is_deleted = 0
                """,
                (group["age_from"], group["to_age"], group["group_id"])
            )

    return {"message": "Saved succuessfully"}



@categories_bp.route("/skill-level", methods = ["GET"])
def get_skill_level():
    skill_level = query_db("select * from skill_level where is_deleted = 0")

    return {"skill_level": skill_level}


@categories_bp.route("/skill-level", methods = ["PUT"])
def save_skill_level():
    data = request.json

    skill_level = data.get("skill_level")

    if not skill_level:
        return {"error": "Skill Level cannot be empty!"}, 400

    checked_skills = []

    for skill in skill_level:
        skill_level_id = skill.get("skill_level_id")
        name = skill.get("name")
        is_deleted = skill.get("is_deleted")

        if is_deleted == 1:
            checked_skills.append({
                "skill_level_id": skill_level_id,
                "is_deleted": 1
            })
            continue

        if name in [None, ""]:
            return {"error": "No empty fields are allowed!"}, 400

        checked_skills.append({
            "skill_level_id": skill_level_id,
            "name": name,
            "is_deleted": 0
        })

    active_skills = [
        skill["name"].lower().replace(" ", "")
        for skill in checked_skills
        if skill.get("is_deleted") == 0
    ]

    for i in range(len(active_skills)):
        for j in range(i + 1, len(active_skills)):
            if active_skills[i] == active_skills[j]:
                return {"error": "Duplicate Skills Detected"}, 400

    # save if no error
    for skill in checked_skills:
        if skill.get("is_deleted") == 1:
            if skill.get("skill_level_id") is not None:
                execute_db("update skill_level set is_deleted = 1 where skill_level_id = %s", (skill["skill_level_id"],))
            continue

        if skill.get("skill_level_id") is None:
            execute_db("insert into skill_level (name, is_deleted) values (%s, 0)", (skill["name"],))
        else:
            execute_db(
                "update skill_level set name = %s where skill_level_id = %s and is_deleted = 0", 
                (skill["name"], skill["skill_level_id"])
            )

    return {"message": "Saved successfully"}



@categories_bp.route("/sport-category", methods = ["GET"])
def get_sport_category():
    sport_category = query_db("select * from sport_category where is_deleted = 0")

    return {"sport_category": sport_category}


@categories_bp.route("/sport-category", methods = ["PUT"])
def save_sport_category():
    data = request.json
    sport_category = data.get("sport_category")

    if not sport_category:
        return {"error": "Sport Category cannot be empty!"}, 400

    checked_categories = []

    for category in sport_category:
        category_id = category.get("category_id")
        name = category.get("name")
        is_deleted = category.get("is_deleted")

        if is_deleted == 1:
            checked_categories.append({
                "category_id": category_id,
                "name": name,
                "is_deleted": 1
            })
            continue

        if name in [None, ""]:
            return {"error": "No empty fields are allowed!"}, 400

        checked_categories.append({
            "category_id": category_id,
            "name": name,
            "is_deleted": 0
        })

    active_category = [
        category["name"].lower().replace(" ", "")
        for category in checked_categories
        if category.get("is_deleted") == 0
    ]

    for i in range(len(active_category)):
        for j in range(i + 1, len(active_category)):
            if active_category[i] == active_category[j]:
                return {"error": "Duplicate Sport Categories Detected"}, 400

    # save if no error
    for category in checked_categories:
        if category.get("is_deleted") == 1:
            if category.get("category_id") is not None:
                execute_db("update sport_category set is_deleted = 1 where category_id = %s", (category["category_id"],))
            continue

        if category.get("category_id") is None:
            execute_db("insert into sport_category (name, is_deleted) values (%s, 0)", (category["name"],))
        else:
            execute_db(
                "update sport_category set name = %s where category_id = %s and is_deleted = 0", 
                (category["name"], category["category_id"])
            )

    return {"message": "Saved successfully"}
