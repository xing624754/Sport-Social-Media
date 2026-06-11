// GET - load the active ads (end_date is today or later)
export const getAds = async () => {
    return await fetch("/api/ads", {
        credentials: "include"
    });
};
