from apscheduler.schedulers.background import BackgroundScheduler
from equipment import update_all_equipments

scheduler = BackgroundScheduler()

def start_scheduler(app):

    def scheduled_job():
        with app.app_context():
            print("🔄 Running equipment scheduler...")
            update_all_equipments()

    # run every 24 hours
    scheduler.add_job(
        func=scheduled_job,
        trigger="interval",
        hours=24,
        id="equipment_update_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    scheduler.start()