import { useEffect, useState } from "react";
import "../styles/tab.css";

export default function AgeGroupTab() {
    const [ageGroups, setAgeGroups] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    // ---------------- LOAD DATA ----------------
    const fetchData = async () => {
        try {
            const res = await fetch("/age-group");
            const data = await res.json();
            const cleaned = (data.age_group || []).map(g => ({
                ...g,
                uid: crypto.randomUUID()
            }));

            setAgeGroups(cleaned);
        } catch (err) {
            console.error("Failed to fetch:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ---------------- EDIT ----------------
    const handleChange = (uid, field, value) => {
        const updated = ageGroups.map(g =>
            g.uid === uid ? { ...g, [field]: value } : g
        );
        setAgeGroups(updated);
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        fetchData(); // Reload fresh data from database to wipe out any local edits
        setIsEditing(false);
    };

    // ---------------- ADD ----------------
    const handleAdd = () => {
        const hasEmpty = ageGroups.some(
            g => g.age_from === "" || g.to_age === ""
        );

        if (hasEmpty) {
            alert("Finish existing row first");
            return;
        }

        setAgeGroups([
            ...ageGroups,
            {
                group_id: null,
                age_from: "",
                to_age: "",
                is_deleted: 0,
                uid: crypto.randomUUID()
            }
        ]);
    };

    // ---------------- DELETE ----------------
    const handleDelete = (uid) => {
        const updated = ageGroups.map(g => {
            if (g.uid === uid) {
                if (g.group_id === null) return null;
                return { ...g, is_deleted: 1 };
            }
            return g;
        }).filter(Boolean);

        setAgeGroups(updated);
    };

    // ---------------- SAVE ----------------
    const handleSave = async () => {
        try {
            // Remove uid before sending to backend, though backend will probably ignore it anyway
            const payload = ageGroups.map(({ uid, ...rest }) => rest);

            const res = await fetch("/age-group", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    age_group: payload
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error);
                return;
            }

            alert("Saved successfully!");
            setIsEditing(false);
            fetchData(); // reload fresh data
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error, please try again.");
        }
    };

    // Dynamically sort the array by age_from
    const sortedAgeGroups = [...ageGroups].sort((a, b) => {
        const aVal = a.age_from === "" || a.age_from === null ? Infinity : Number(a.age_from);
        const bVal = b.age_from === "" || b.age_from === null ? Infinity : Number(b.age_from);
        return aVal - bVal;
    });

    return (
        <>
            <div className="tableCard">
                <div className="tableToolbar">
                    <div className="headerActions">
                        {!isEditing ? (
                            <>
                                <button className="btn btnPrimary" onClick={handleEdit}>
                                    <span className="material-symbols-outlined">edit</span>
                                    Edit Mode
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn btnOutline" onClick={handleCancel}>
                                    <span className="material-symbols-outlined">close</span>
                                    Cancel
                                </button>
                                <button className="btn btnOutline" onClick={handleAdd}>
                                    <span className="material-symbols-outlined">add</span>
                                    Add Row
                                </button>
                                <button className="btn btnPrimary" onClick={handleSave}>
                                    <span className="material-symbols-outlined">save</span>
                                    Save All
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="tableResponsive">
                    <table className="dataTable">
                        <thead>
                            <tr>
                                <th className="col10">#</th>
                                <th>Age From</th>
                                <th>Age To</th>
                                {isEditing && <th className="colActions">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAgeGroups
                                .filter(g => g.is_deleted !== 1)
                                .map((g, index) => {
                                    return (
                                        <tr key={g.uid}>
                                            <td>
                                                <span className="idBadge">
                                                    {index + 1}
                                                </span>
                                            </td>

                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="editInput"
                                                        type="number"
                                                        value={g.age_from}
                                                        onChange={(e) => handleChange(g.uid, "age_from", e.target.value)}
                                                        placeholder="e.g. 18"
                                                    />
                                                ) : (
                                                    <span className="textSemibold">{g.age_from}</span>
                                                )}
                                            </td>

                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        className="editInput"
                                                        type="number"
                                                        value={g.to_age}
                                                        onChange={(e) => handleChange(g.uid, "to_age", e.target.value)}
                                                        placeholder="e.g. 35"
                                                    />
                                                ) : (
                                                    <span className="textSemibold">{g.to_age}</span>
                                                )}
                                            </td>

                                            {isEditing && (
                                                <td>
                                                    <div className="actionBtns">
                                                        <button
                                                            className="iconBtn delete"
                                                            onClick={() => handleDelete(g.uid)}
                                                            title="Delete"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}

                            {sortedAgeGroups.filter(g => g.is_deleted !== 1).length === 0 && (
                                <tr>
                                    <td colSpan={isEditing ? 4 : 3} className="emptyRowCell">
                                        No age groups found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="tableFooter">
                    <span className="footerStats">
                        Showing {sortedAgeGroups.filter(g => g.is_deleted !== 1).length} active age groups
                    </span>
                </div>
            </div>

        </>
    );
}
