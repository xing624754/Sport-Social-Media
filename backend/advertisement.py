from flask import Blueprint, session
from extensions import query_db
from datetime import date

advertisement_bp = Blueprint("advertisement", __name__)


# GET - load all ads that are still active (end_date is today or later).
# An advertisement is stored as a row in the `post` table with type='Advertisement',
# PLUS a row in the `advertisement` table that adds an image and an end date.
@advertisement_bp.route("/ads", methods=["GET"])
def get_ads():
    # Must be logged in to see the ads.
    user_id = session.get("user_id")
    if not user_id:
        return {"error": "You must login"}, 401

    # Get local current date to avoid database timezone mismatch.
    today_str = date.today().strftime("%Y-%m-%d")

    # Join advertisement + post + user to get every field the frontend needs.
    ads = query_db(
        """
        SELECT a.advertisement_id, u.username,
               p.title, p.description,
               a.ads_profile_pic,
               p.num_of_like, p.num_of_comment
        FROM advertisement a
        JOIN post p ON a.advertisement_id = p.post_id
        JOIN `user` u ON p.user_id = u.user_id
        WHERE a.end_date >= %s
          AND p.is_deleted = 0
          AND p.type = 'Advertisement'
        ORDER BY a.end_date ASC
        """,
        (today_str,)
    )

    if ads == "error":
        return {"error": "Could not load ads"}, 500

    ads = ads or []

    # Attach each ad's uploaded pictures/videos (stored in post_media)
    # so the feed can show them — not just the logo + text.
    if ads:
        ad_ids = [ad["advertisement_id"] for ad in ads]
        placeholders = ", ".join(["%s"] * len(ad_ids))
        media_rows = query_db(
            "SELECT post_id, media_url FROM post_media WHERE post_id IN (" + placeholders + ")",
            tuple(ad_ids)
        )
        media_by_ad = {}
        if media_rows and media_rows != "error":
            for row in media_rows:
                media_by_ad.setdefault(row["post_id"], []).append(row["media_url"])
        for ad in ads:
            ad["media_urls"] = media_by_ad.get(ad["advertisement_id"], [])

        # Mark whether the current user has liked / favorited each ad (ads are posts).
        liked = query_db(
            "SELECT post_id FROM post_like WHERE user_id = %s AND post_id IN (" + placeholders + ")",
            tuple([user_id] + ad_ids)
        )
        liked_ids = {r["post_id"] for r in liked} if liked and liked != "error" else set()
        favs = query_db(
            "SELECT post_id FROM post_favorite WHERE user_id = %s AND post_id IN (" + placeholders + ")",
            tuple([user_id] + ad_ids)
        )
        fav_ids = {r["post_id"] for r in favs} if favs and favs != "error" else set()
        for ad in ads:
            ad["is_liked"] = ad["advertisement_id"] in liked_ids
            ad["is_favorited"] = ad["advertisement_id"] in fav_ids

    return {"data": ads}
