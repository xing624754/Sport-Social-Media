# routes/admin.py

from flask import Blueprint, jsonify, request
from extensions import mysql

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/api/admin/analytics", methods=["GET"])
def get_admin_analytics():
    from datetime import datetime, timedelta
    import calendar
    import traceback

    cursor = None
    try:
        cursor = mysql.connection.cursor()

        # 1. Parse selected month parameter (format: YYYY-MM)
        month_param = request.args.get("month")
        if month_param:
            try:
                parts = month_param.split("-")
                year = int(parts[0])
                month_val = int(parts[1])
            except (ValueError, IndexError):
                return jsonify({"error": "Invalid month format. Use YYYY-MM"}), 400
        else:
            now = datetime.now()
            year = now.year
            month_val = now.month

        # Define current/selected month timestamps
        selected_date = datetime(year, month_val, 1)
        last_day_selected = calendar.monthrange(year, month_val)[1]
        end_of_selected_str = f"{year:04d}-{month_val:02d}-{last_day_selected:02d} 23:59:59"

        # Calculate previous month numbers
        prev_date = selected_date - timedelta(days=1)
        prev_year = prev_date.year
        prev_month_val = prev_date.month
        last_day_prev = calendar.monthrange(prev_year, prev_month_val)[1]
        end_of_prev_str = f"{prev_year:04d}-{prev_month_val:02d}-{last_day_prev:02d} 23:59:59"

        # Helper function to get snapshot metrics for a specific month context
        def get_metrics_for_month(m_val, y_val, end_date_str):
            # Total Users up to that month
            cursor.execute("SELECT COUNT(*) FROM user WHERE status != 'Deleted' AND join_at <= %s", (end_date_str,))
            tot_users = cursor.fetchone()[0]

            # Active Users during that month
            cursor.execute("SELECT COUNT(DISTINCT user_id) FROM post WHERE MONTH(timestamp) = %s AND YEAR(timestamp) = %s AND is_deleted = 0", (m_val, y_val))
            act_users = cursor.fetchone()[0]

            # New Users during that month
            cursor.execute("SELECT COUNT(*) FROM user WHERE MONTH(join_at) = %s AND YEAR(join_at) = %s", (m_val, y_val))
            new_users = cursor.fetchone()[0]

            # Total Communities up to that month
            cursor.execute("SELECT COUNT(*) FROM community WHERE created_at <= %s", (end_date_str,))
            tot_comm = cursor.fetchone()[0]

            # Active Communities during that month
            cursor.execute("""
                SELECT COUNT(DISTINCT cp.community_id)
                FROM community_post cp
                INNER JOIN post p ON cp.post_id = p.post_id
                WHERE cp.is_deleted = 0 AND p.is_deleted = 0
                AND MONTH(p.timestamp) = %s AND YEAR(p.timestamp) = %s
            """, (m_val, y_val))
            act_comm = cursor.fetchone()[0]

            # New Communities during that month
            cursor.execute("SELECT COUNT(*) FROM community WHERE MONTH(created_at) = %s AND YEAR(created_at) = %s", (m_val, y_val))
            new_comm = cursor.fetchone()[0]

            return {
                "totalUsers": tot_users,
                "activeUsers": act_users,
                "newUsersThisMonth": new_users,
                "totalCommunities": tot_comm,
                "activeCommunities": act_comm,
                "newCommunitiesThisMonth": new_comm
            }

        # Gather data blocks for both months
        current_metrics = get_metrics_for_month(month_val, year, end_of_selected_str)
        previous_metrics = get_metrics_for_month(prev_month_val, prev_year, end_of_prev_str)

        # TABLES: Fetch Latest Communities (Strictly for Selected Month)
        cursor.execute("""
            SELECT community_id, name, created_at FROM community
            WHERE MONTH(created_at) = %s AND YEAR(created_at) = %s
            ORDER BY created_at DESC LIMIT 10
        """, (month_val, year))
        latest_communities = [{"community_id": r[0], "name": r[1], "created_date": r[2]} for r in cursor.fetchall()]

        # TABLES: Active Communities ranked by post volume (Strictly for Selected Month)
        cursor.execute("""
            SELECT c.community_id, c.name, COUNT(p.post_id) AS cpost
            FROM community c
            LEFT JOIN community_post cp ON c.community_id = cp.community_id AND cp.is_deleted = 0
            LEFT JOIN post p ON cp.post_id = p.post_id AND p.is_deleted = 0 AND MONTH(p.timestamp) = %s AND YEAR(p.timestamp) = %s
            GROUP BY c.community_id, c.name
            ORDER BY cpost DESC, c.name ASC LIMIT 10
        """, (month_val, year))
        trending_communities = [{"community_id": r[0], "name": r[1], "members": r[2]} for r in cursor.fetchall()]

        cursor.close()

        # Return the expected structured format
        return jsonify({
            "labels": {
                "current": selected_date.strftime("%B %Y"), # e.g. "May 2026"
                "previous": prev_date.strftime("%B %Y")     # e.g. "April 2026"
            },
            "current": current_metrics,
            "previous": previous_metrics,
            "latestCommunities": latest_communities,
            "trendingCommunities": trending_communities
        })

    except Exception as e:
        traceback.print_exc()
        if cursor: cursor.close()
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500