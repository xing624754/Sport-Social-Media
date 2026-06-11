from apscheduler.schedulers.background import BackgroundScheduler
from fit_guides import update_all_fit_guides

fit_guides_scheduler = BackgroundScheduler()

def start_fit_guides_scheduler(app):

    def fit_guides_job():
        with app.app_context():
            print("Running fitness guides scheduler...")
            update_all_fit_guides()

    # run every 24 hours
    fit_guides_scheduler.add_job(
        func=fit_guides_job,
        trigger="interval",
        hours=24,
        id="fit_guides_update_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True
    )

    fit_guides_scheduler.start()
