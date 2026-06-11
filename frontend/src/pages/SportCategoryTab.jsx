import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "../styles/tab.css";

export default function SportCategoryTab() {
    const [categories, setCategories] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    // ---------------- LOAD DATA ----------------
    const fetchData = async () => {
        try {
            const res = await fetch("/sport-category");
            const data = await res.json();
            const cleaned = (data.sport_category || []).map(c => ({
                ...c,
                uid: crypto.randomUUID()
            }));

            setCategories(cleaned);
        } catch (err) {
            console.error("Failed to fetch:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ---------------- EDIT ----------------
    const handleChange = (uid, field, value) => {
        const updated = categories.map(c =>
            c.uid === uid ? { ...c, [field]: value } : c
        );
        setCategories(updated);
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        fetchData();
        setIsEditing(false);
    };

    // ---------------- ADD ----------------
    const [searchTerm, setSearchTerm] = useState("");

    const handleAdd = () => {
        if (searchTerm !== "") {
            toast.info("Please clear search content to add new category");
            return;
        }

        const hasEmpty = categories.some(c => c.name === "");

        if (hasEmpty) {
            alert("Finish existing row first");
            return;
        }

        setCategories([
            ...categories,
            {
                category_id: null,
                name: "",
                is_deleted: 0,
                uid: crypto.randomUUID()
            }
        ]);
    };

    // ---------------- DELETE ----------------
    const handleDelete = (uid) => {
        const updated = categories.map(c => {
            if (c.uid === uid) {
                if (c.category_id === null) return null;
                return { ...c, is_deleted: 1 };
            }
            return c;
        }).filter(Boolean);

        setCategories(updated);
    };

    // ---------------- SAVE ----------------
    const handleSave = async () => {
        try {
            const payload = categories.map(({ uid, ...rest }) => rest);

            const res = await fetch("/sport-category", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sport_category: payload
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to save. (Backend might not have PUT implemented yet)");
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

    const sortedCategories = [...categories].sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        if (nameA === "" && nameB !== "") return 1;
        if (nameA !== "" && nameB === "") return -1;
        return nameA.localeCompare(nameB);
    });

    const filteredCategories = sortedCategories.filter(c =>
        c.is_deleted !== 1 &&
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="tableCard">
            <div className="tableToolbar">
                <div className="searchBar">
                    <span className="material-symbols-outlined">search</span>
                    <input
                        type="text"
                        placeholder="Search sport categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
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
                            <button className={`btn btnOutline ${searchTerm !== "" ? "disabled" : ""}`} onClick={handleAdd}>
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
                            <th>Category Name</th>
                            {isEditing && <th className="colActions">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCategories
                            .map((c, index) => {
                                return (
                                    <tr key={c.uid}>
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
                                                    value={c.name}
                                                    onChange={(e) => handleChange(c.uid, "name", e.target.value)}
                                                    placeholder="e.g. Basketball"
                                                />
                                            ) : (
                                                <span className="textSemibold">{c.name}</span>
                                            )}
                                        </td>
                                        {isEditing && (
                                            <td>
                                                <div className="actionBtns">
                                                    <button
                                                        className="iconBtn delete"
                                                        onClick={() => handleDelete(c.uid)}
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
                        {categories.filter(c => c.is_deleted !== 1).length === 0 && (
                            <tr>
                                <td colSpan={isEditing ? 3 : 2} style={{ textAlign: 'center', padding: '40px', color: 'var(--textMuted)' }}>
                                    No sport categories found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="tableFooter">
                <span className="footerStats">
                    Showing {filteredCategories.length} categories {searchTerm && `(filtered)`}
                </span>
            </div>
        </div>
    );
}
