export const findPlayer = async (userID, gender, ageGroup, sport, skillLevel) => {
    return await fetch("/find-player", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            userID,
            gender,
            ageGroup,
            sport,
            skillLevel
        })
    });
};