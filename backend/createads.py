from flask import (
    Blueprint,
    request,
    jsonify,
    current_app,
    session,
    send_from_directory
)

from extensions import mysql

import os
import string
import re
import json

createads_bp = Blueprint(
    "createads",
    __name__
)



# SERVE UPLOADS
@createads_bp.route(
    "/uploads/ads/<path:filename>"
)
def uploaded_file(filename):

    ads_folder = os.path.join(
        current_app.config["UPLOAD_FOLDER"],
        "ads"
    )

    return send_from_directory(
        ads_folder,
        filename
    )



# CREATE ADVERTISEMENT
@createads_bp.route(
    "/advertisements",
    methods=["POST"]
)
def create_advertisement():

    try:

        
        # ADS FOLDER
        ads_folder = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            "ads"
        )

        os.makedirs(
            ads_folder,
            exist_ok=True
        )

        
        # SESSION
        user_id = session.get("user_id")

        if not user_id:

            return jsonify({
                "error": "Unauthorized"
            }), 401

        
        # FORM DATA
        brand_name = request.form.get(
            "brand_name"
        )

        description = request.form.get(
            "description"
        )

        end_date = request.form.get(
            "end_date"
        )

        logo = request.files.get(
            "logo_image"
        )

        ad_images = request.files.getlist(
            "ad_images"
        )

       
        # VALIDATION
        if not brand_name:

            return jsonify({
                "error":
                "Brand name required"
            }), 400

        if len(ad_images) > 9:

            return jsonify({
                "error":
                "Maximum 9 files allowed"
            }), 400

   
        # EXTRACT URL
        url_match = re.search(
            r"https?://\S+",
            description or ""
        )

        target_url = (
            url_match.group(0)
            if url_match
            else None
        )

        cursor = mysql.connection.cursor()

   
        # INSERT POST
        cursor.execute(
            """
            INSERT INTO post
            (
                user_id,
                title,
                description,
                publicity,
                type
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user_id,
                brand_name,
                description,
                "Public",
                "Advertisement"
            )
        )

        advertisement_id = (
            cursor.lastrowid
        )


        # SAVE LOGO
        logo_url = None

        if logo and logo.filename != "":

            ext = os.path.splitext(
                logo.filename
            )[1]

            logo_filename = (
                f"{advertisement_id}_logo"
                f"{ext}"
            )

            logo_path = os.path.join(
                ads_folder,
                logo_filename
            )

            logo.save(logo_path)

            logo_url = (
                f"/uploads/ads/{logo_filename}"
            )


        # INSERT ADVERTISEMENT
        cursor.execute(
            """
            INSERT INTO advertisement
            (
                advertisement_id,
                end_date,
                ads_profile_pic
            )
            VALUES (%s, %s, %s)
            """,
            (
                advertisement_id,
                end_date,
                logo_url
            )
        )


        # SAVE MEDIA
        for index, image in enumerate(
            ad_images
        ):

            if image and image.filename != "":

                letter = (
                    string.ascii_lowercase[
                        index
                    ]
                )

                ext = os.path.splitext(
                    image.filename
                )[1]

                filename = (
                    f"{advertisement_id}"
                    f"{letter}"
                    f"{ext}"
                )

                image_path = os.path.join(
                    ads_folder,
                    filename
                )

                image.save(image_path)

                media_url = (
                    f"/uploads/ads/{filename}"
                )

                cursor.execute(
                    """
                    INSERT INTO post_media
                    (
                        post_id,
                        media_url
                    )
                    VALUES (%s, %s)
                    """,
                    (
                        advertisement_id,
                        media_url
                    )
                )

        mysql.connection.commit()

        cursor.close()

        return jsonify({
            "message":
            "Advertisement created successfully"
        }), 201

    except Exception as e:

        mysql.connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# GET ALL ADS
@createads_bp.route(
    "/advertisements",
    methods=["GET"]
)
def get_advertisements():

    try:

        cursor = mysql.connection.cursor()

        cursor.execute(
            """
            SELECT
                advertisement.advertisement_id,
                advertisement.end_date,
                advertisement.ads_profile_pic,
                post.title,
                post.description

            FROM advertisement

            JOIN post
            ON advertisement.advertisement_id = post.post_id

            WHERE post.type = 'Advertisement'
            AND post.is_deleted = 0

            ORDER BY advertisement.advertisement_id DESC
            """
        )

        rows = cursor.fetchall()

        advertisements = []

        for row in rows:

            media_cursor = (
                mysql.connection.cursor()
            )

            media_cursor.execute(
                """
                SELECT media_url
                FROM post_media
                WHERE post_id = %s
                """,
                (row[0],)
            )

            media_rows = (
                media_cursor.fetchall()
            )

            media_urls = [
                media[0]
                for media in media_rows
            ]

            media_cursor.close()

            description = row[4] or ""

            url_match = re.search(
                r"https?://\S+",
                description
            )

            target_url = (
                url_match.group(0)
                if url_match
                else None
            )

            advertisements.append({

                "advertisement_id":
                row[0],

                "end_date":
                str(row[1])
                if row[1]
                else "",

                "logo_image":
                row[2],

                "brand_name":
                row[3],

                "description":
                row[4],

                "target_url":
                target_url,

                "media_urls":
                media_urls

            })

        cursor.close()

        return jsonify(
            advertisements
        )

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500



# UPDATE ADVERTISEMENT
@createads_bp.route(
    "/advertisements/<int:advertisement_id>",
    methods=["PUT"]
)
def update_advertisement(
    advertisement_id
):

    try:


        # ADS FOLDER
        ads_folder = os.path.join(
            current_app.config["UPLOAD_FOLDER"],
            "ads"
        )

        os.makedirs(
            ads_folder,
            exist_ok=True
        )

        brand_name = request.form.get(
            "brand_name"
        )

        description = request.form.get(
            "description"
        )

        end_date = request.form.get(
            "end_date"
        )

        logo = request.files.get(
            "logo_image"
        )

        ad_images = request.files.getlist(
            "ad_images"
        )

        cursor = mysql.connection.cursor()

   
        # UPDATE POST
        cursor.execute(
            """
            UPDATE post
            SET
                title = %s,
                description = %s
            WHERE post_id = %s
            """,
            (
                brand_name,
                description,
                advertisement_id
            )
        )


        # UPDATE ADVERTISEMENT
        cursor.execute(
            """
            UPDATE advertisement
            SET end_date = %s
            WHERE advertisement_id = %s
            """,
            (
                end_date,
                advertisement_id
            )
        )


        # UPDATE LOGO
        if logo and logo.filename != "":

            ext = os.path.splitext(
                logo.filename
            )[1]

            logo_filename = (
                f"{advertisement_id}_logo"
                f"{ext}"
            )

            logo_path = os.path.join(
                ads_folder,
                logo_filename
            )

            logo.save(logo_path)

            logo_url = (
                f"/uploads/ads/{logo_filename}"
            )

            cursor.execute(
                """
                UPDATE advertisement
                SET ads_profile_pic = %s
                WHERE advertisement_id = %s
                """,
                (
                    logo_url,
                    advertisement_id
                )
            )


        # REMOVE EXISTING MEDIA
        removed_existing_media = request.form.get(
            "removed_existing_media"
        )

        if removed_existing_media:

            removed_existing_media = (
                json.loads(removed_existing_media)
            )

            for media_url in removed_existing_media:

                # DELETE FROM DATABASE
                cursor.execute(
                    """
                    DELETE FROM post_media
                    WHERE post_id = %s
                    AND media_url = %s
                    """,
                    (
                        advertisement_id,
                        media_url
                    )
                )

                # DELETE FILE
                filename = os.path.basename(
                    media_url
                )

                file_path = os.path.join(
                    ads_folder,
                    filename
                )

                if os.path.exists(file_path):

                    os.remove(file_path)

        # SAVE NEW MEDIA
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM post_media
            WHERE post_id = %s
            """,
            (advertisement_id,)
        )

        current_count = cursor.fetchone()[0]

        for index, image in enumerate(
            ad_images,
            start=current_count
        ):

            if image and image.filename != "":

                letter = (
                    string.ascii_lowercase[
                        index
                    ]
                )

                ext = os.path.splitext(
                    image.filename
                )[1]

                filename = (
                    f"{advertisement_id}"
                    f"{letter}"
                    f"{ext}"
                )

                image_path = os.path.join(
                    ads_folder,
                    filename
                )

                image.save(image_path)

                media_url = (
                    f"/uploads/ads/{filename}"
                )

                cursor.execute(
                    """
                    INSERT INTO post_media
                    (
                        post_id,
                        media_url
                    )
                    VALUES (%s, %s)
                    """,
                    (
                        advertisement_id,
                        media_url
                    )
                )

        mysql.connection.commit()

        cursor.close()

        return jsonify({
            "message":
            "Advertisement updated successfully"
        }), 200

    except Exception as e:

        mysql.connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500


# DELETE ADVERTISEMENT
@createads_bp.route(
    "/advertisements/<int:advertisement_id>",
    methods=["DELETE"]
)
def delete_advertisement(
    advertisement_id
):

    try:

        cursor = mysql.connection.cursor()

        cursor.execute(
            """
            UPDATE post
            SET is_deleted = 1
            WHERE post_id = %s
            """,
            (advertisement_id,)
        )

        mysql.connection.commit()

        cursor.close()

        return jsonify({
            "message":
            "Advertisement soft deleted successfully"
        }), 200

    except Exception as e:

        mysql.connection.rollback()

        return jsonify({
            "error": str(e)
        }), 500