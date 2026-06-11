from flask import Blueprint, request, session
from extensions import query_db, execute_db
import requests
import os

fit_guides_bp = Blueprint("fit_guides", __name__)

DEFAULT_SKILL_LEVEL = 1     # Beginner
MAX_VIDEOS = 30

@fit_guides_bp.route("/fit-guides")
def get_fit_guides():
    sport_param = request.args.get("sport_id", "1")

    # Recommended mode: videos for the sports and skill levels the user has in their profile.
    if sport_param == "recommended":
        user_id = session.get("user_id")
        if not user_id:
            return {"error": "You must login"}, 401
        return {"data": recommend_fit_guides(user_id)}

    sport_id = int(sport_param)

    sport_row = query_db(
        "SELECT name FROM sport_category WHERE category_id = %s AND is_deleted = 0",
        (sport_id,)
    )
    if not sport_row:
        return {"error": "Invalid sport"}
    sport_name = sport_row[0]["name"]

    #  check if DB is empty for this sport 
    count_row = query_db(
        "SELECT COUNT(*) AS total FROM fitness_guide WHERE sport_category = %s",
        (sport_id,)
    )
    current_count = count_row[0]["total"]

    #  if empty, fetch 30 from YouTube + save to DB
    if current_count == 0:
        new_videos = fetch_from_youtube(sport_name, MAX_VIDEOS)
        save_videos(new_videos, sport_id)

    # if not empty, delete videos > 2 years, refill to 30 
    else:
        # delete old videos
        execute_db("""
            DELETE FROM fitness_guide
            WHERE sport_category = %s
                AND created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
        """, (sport_id,))

        # count again after deletion
        count_row = query_db(
            "SELECT COUNT(*) AS total FROM fitness_guide WHERE sport_category = %s",
            (sport_id,)
        )
        after_delete = count_row[0]["total"]

        # refill if any were deleted
        if after_delete < MAX_VIDEOS:
            needed = MAX_VIDEOS - after_delete
            new_videos = fetch_from_youtube(sport_name, needed)
            save_videos(new_videos, sport_id)

    #  return all videos from DB to frontend 
    videos = query_db("""
        SELECT video_id AS youtube_id, title, description, thumbnail_url AS thumbnail
        FROM fitness_guide
        WHERE sport_category = %s
        ORDER BY created_at DESC
    """, (sport_id,))

    return {"data": videos}


# Recommend: videos matching the user's sport and skill level.
def recommend_fit_guides(user_id):
    prefs = query_db(
        "SELECT sport, skill_level FROM user_detail WHERE user_id = %s",
        (user_id,)
    )
    if not prefs or prefs == "error":
        return []

    # For each sport+skill the user has, make sure videos exist (fetch if none).
    for pref in prefs:
        sport_id, skill_id = pref["sport"], pref["skill_level"]
        count_row = query_db(
            "SELECT COUNT(*) AS total FROM fitness_guide WHERE sport_category = %s AND skill_level = %s",
            (sport_id, skill_id)
        )
        if count_row == "error" or count_row[0]["total"] > 0:
            continue

        sport_row = query_db("SELECT name FROM sport_category WHERE category_id = %s", (sport_id,))
        skill_row = query_db("SELECT name FROM skill_level WHERE skill_level_id = %s", (skill_id,))
        if not sport_row or not skill_row:
            continue

        # e.g. "Badminton Advanced" -> searched on YouTube as "Badminton Advanced workout"
        new_videos = fetch_from_youtube(f"{sport_row[0]['name']} {skill_row[0]['name']}", MAX_VIDEOS)
        save_videos(new_videos, sport_id, skill_id)

    # Return videos that match any of the user's sport+skill pairs.
    conditions = " OR ".join(["(sport_category = %s AND skill_level = %s)"] * len(prefs))
    params = []
    for pref in prefs:
        params.extend([pref["sport"], pref["skill_level"]])

    videos = query_db(f"""
        SELECT video_id AS youtube_id, title, description, thumbnail_url AS thumbnail
        FROM fitness_guide
        WHERE {conditions}
        ORDER BY created_at DESC
    """, tuple(params))

    return [] if videos == "error" else videos


# ask YouTube for videos 
def fetch_from_youtube(sport, count):
    api_key = os.getenv("YOUTUBE_API_KEY")
    response = requests.get(
        "https://www.googleapis.com/youtube/v3/search",
        params={
            "part": "snippet",
            "q": sport + " workout",
            "type": "video",
            "order": "relevance",
            "maxResults": min(count, 50),   # YouTube max per call is 50
            "videoEmbeddable": "true",
            "videoDuration": "medium",
            "safeSearch": "strict",
            "key": api_key,
        }
    )
    if response.status_code != 200:
        return []

    items = response.json().get("items", [])
    return [{
        "youtube_id": v["id"]["videoId"],
        "title": v["snippet"]["title"],
        "description": v["snippet"]["description"],
        "thumbnail": v["snippet"]["thumbnails"]["high"]["url"],
    } for v in items]


# save videos to fitness_guide table
def save_videos(videos, sport_id, skill_level=DEFAULT_SKILL_LEVEL):
    for video in videos:
        # skip if already in DB (avoid duplicates)
        existing = query_db(
            "SELECT guide_id FROM fitness_guide WHERE video_id = %s",
            (video["youtube_id"],)
        )
        if existing:
            continue

        execute_db("""
            INSERT INTO fitness_guide
                (skill_level, sport_category, title, description,
                content_type, url, video_id, thumbnail_url, source)
                VALUES (%s, %s, %s, %s, 'Video', %s, %s, %s, 'YouTube')
        """, (
            skill_level,
            sport_id,
            video["title"][:100],   # title column is varchar(100)
            video["description"],
            f"https://www.youtube.com/watch?v={video['youtube_id']}",
            video["youtube_id"],
            video["thumbnail"],
        ))


# Run by the scheduler
# refresh every sport's videos (delete old, refill to 30).
def update_all_fit_guides():
    sports = query_db("SELECT category_id, name FROM sport_category WHERE is_deleted = 0")
    if sports == "error" or not sports:
        return

    for sport in sports:
        sport_id = sport["category_id"]
        sport_name = sport["name"]

        execute_db("""
            DELETE FROM fitness_guide
            WHERE sport_category = %s
                AND created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
        """, (sport_id,))

        count_row = query_db(
            "SELECT COUNT(*) AS total FROM fitness_guide WHERE sport_category = %s",
            (sport_id,)
        )
        if count_row == "error":
            continue
        current = count_row[0]["total"]

        if current < MAX_VIDEOS:
            needed = MAX_VIDEOS - current
            new_videos = fetch_from_youtube(sport_name, needed)
            save_videos(new_videos, sport_id)
