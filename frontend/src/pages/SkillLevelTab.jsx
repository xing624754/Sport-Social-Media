import { useEffect, useState } from "react";
import "../styles/tab.css";

export default function SkillLevelTab() {
    const [skills, setSkills] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    // ---------------- LOAD DATA ----------------
    const fetchData = async () => {
        try {
            const res = await fetch("/skill-level");
            const data = await res.json();
            const cleaned = (data.skill_level || []).map(s => ({
                ...s,
                uid: crypto.randomUUID()
            }));

            setSkills(cleaned);
        } catch (err) {
            console.error("Failed to fetch:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ---------------- EDIT ----------------
    const handleChange = (uid, field, value) => {
        const updated = skills.map(s =>
            s.uid === uid ? { ...s, [field]: value } : s
        );
        setSkills(updated);
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        fetchData();
        setIsEditing(false);
    };

    // ---------------- ADD ----------------
    const handleAdd = () => {
        const hasEmpty = skills.some(s => s.name === "");

        if (hasEmpty) {
            alert("Finish existing row first");
            return;
        }

        setSkills([
            ...skills,
            {
                skill_level_id: null,
                name: "",
                is_deleted: 0,
                uid: crypto.randomUUID()
            }
        ]);
    };

    // ---------------- DELETE ----------------
    const handleDelete = (uid) => {
        const updated = skills.map(s => {
            if (s.uid === uid) {
                if (s.skill_level_id === null) return null;
                return { ...s, is_deleted: 1 };
            }
            return s;
        }).filter(Boolean);

        setSkills(updated);
    };

    // ---------------- SAVE ----------------
    const handleSave = async () => {
        try {
            const payload = skills.map(({ uid, ...rest }) => rest);

            const res = await fetch("/skill-level", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    skill_level: payload
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to save");
                return;
            }

            alert("Saved successfully!");
            setIsEditing(false);
            fetchData();
        } catch (err) {
            console.error("Save error:", err);
            alert("Network error, please try again.");
        }
    };

    return (
        <div className="tableCard">
            <div className="tableToolbar">
                <div className="headerActions">
                    {!isEditing ? (
                        <button className="btn btnPrimary" onClick={handleEdit}>
                            <span className="material-symbols-outlined">edit</span>
                            Edit Mode
                        </button>
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
                            <th>Skill Level Name</th>
                            {isEditing && <th className="colActions">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {skills
                            .filter(s => s.is_deleted !== 1)
                            .map((s, index) => {
                                return (
                                    <tr key={s.uid}>
                                        <td>
                                            <span className="idBadge">
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td>
                                            {isEditing ? (
                                                <input
                                                    className="editInput"
                                                    type="text"
                                                    value={s.name}
                                                    onChange={(e) => handleChange(s.uid, "name", e.target.value)}
                                                    placeholder="e.g. Intermediate"
                                                />
                                            ) : (
                                                <span className="textSemibold">{s.name}</span>
                                            )}
                                        </td>
                                        {isEditing && (
                                            <td>
                                                <div className="actionBtns">
                                                    <button
                                                        className="iconBtn delete"
                                                        onClick={() => handleDelete(s.uid)}
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
                        {skills.filter(s => s.is_deleted !== 1).length === 0 && (
                            <tr>
                                <td colSpan={isEditing ? 3 : 2} style={{ textAlign: 'center', padding: '40px', color: 'var(--textMuted)' }}>
                                    No skill levels found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="tableFooter">
                <span className="footerStats">
                    Showing {skills.filter(s => s.is_deleted !== 1).length} active skill levels
                </span>
            </div>
        </div>
    );
}
