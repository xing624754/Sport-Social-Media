export const getEquipments = async (selected, userID) => {
    return await fetch("/equipment/load-equipments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            selected,
            userID
        })
    });
};
