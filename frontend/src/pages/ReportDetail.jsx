import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../api/socket";
import "../styles/ManageCategory.css"; // Reuse categories styles for consistency
import "../styles/ViewPost.css"; // Reuse post view card styles

export default function ReportDetail() {
    const { report_id: reportId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReportDetail = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/review-report/${reportId}`);
            if (!res.ok) throw new Error("Report not found");
            const result = await res.json();
            setData(result.data);
        } catch (err) {
            console.error("Error fetching report detail:", err);
            alert("Could not load report details.");
            navigate("/admin/reviews");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (reportId) {
            fetchReportDetail();
        }

        socket.on("reports_updated", fetchReportDetail);
        return () => {
            socket.off("reports_updated", fetchReportDetail);
        };
    }, [reportId]);

    const handleAction = async (action) => {
        const confirmMessage = action === "Approved"
            ? "Are you sure you want to Approve this report? This will delete the reported post permanently."
            : "Are you sure you want to Reject this report? This will dismiss the report and keep the post.";

        if (!window.confirm(confirmMessage)) return;

        try {
            const res = await fetch(`/api/review-report/${reportId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: action })
            });

            const responseData = await res.json();

            if (!res.ok) {
                alert(responseData.error || `Failed to update report status.`);
                return;
            }

            alert(`Report successfully ${action.toLowerCase()}!`);
            navigate("/admin/reviews");
        } catch (err) {
            console.error("Action error:", err);
            alert("Network error. Please try again.");
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "100px", color: "var(--textMuted)" }}>
                Loading report details...
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ textAlign: "center", padding: "100px", color: "var(--textMuted)" }}>
                No report data found.
            </div>
        );
    }

    const { report, post, other_reports = [] } = data;

    return (
        <>
            <div className="manageCategoryPage">
                <main className="mainContent" style={{ maxWidth: "900px", margin: "0 auto" }}>
                    
                    {/* Back Button */}
                    <button 
                        className="backBtn" 
                        onClick={() => navigate("/admin/reviews")}
                        style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0" }}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Back to Reports
                    </button>

                    {/* Dashboard Header */}
                    <div className="dashboardHeader" style={{ marginBottom: "24px" }}>
                        <div>
                            <h2 className="headerTitle">Report Moderation Details</h2>
                            <p className="headerDesc">
                                Review the report details and the corresponding flagged content to take action.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", alignItems: "start" }}>
                        
                        {/* Report Info Card */}
                        <div className="tableCard" style={{ padding: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--onBackground)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>info</span>
                                Report Information
                            </h3>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                                <div>
                                    <span style={{ display: "block", fontSize: "12px", color: "var(--textMuted)", fontWeight: "500", textTransform: "uppercase" }}>Report ID</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600" }}>#{report.report_id}</span>
                                </div>
                                <div>
                                    <span style={{ display: "block", fontSize: "12px", color: "var(--textMuted)", fontWeight: "500", textTransform: "uppercase" }}>Report Type</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600" }}>{report.type}</span>
                                </div>
                                <div>
                                    <span style={{ display: "block", fontSize: "12px", color: "var(--textMuted)", fontWeight: "500", textTransform: "uppercase" }}>Reporter</span>
                                    {report.user_id ? (
                                        <span style={{ fontSize: "15px", fontWeight: "600" }}>User #{report.user_id}</span>
                                    ) : (
                                        <span style={{
                                            color: "var(--primary)",
                                            fontWeight: "700",
                                            fontSize: "11px",
                                            textTransform: "uppercase",
                                            backgroundColor: "var(--surfaceContainerLow)",
                                            padding: "2px 6px",
                                            borderRadius: "4px"
                                        }}>
                                            AI Auto-Moderator
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span style={{ display: "block", fontSize: "12px", color: "var(--textMuted)", fontWeight: "500", textTransform: "uppercase" }}>Admin ID</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600" }}>
                                        {report.admin_id ? `Admin #${report.admin_id}` : "-"}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ display: "block", fontSize: "12px", color: "var(--textMuted)", fontWeight: "500", textTransform: "uppercase" }}>Date Flagged</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600" }}>{report.created_at}</span>
                                </div>
                            </div>

                            {/* Reason Description Box */}
                            <div style={{ backgroundColor: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "16px", borderRadius: "4px", marginBottom: "24px" }}>
                                <span style={{ display: "block", fontSize: "12px", color: "#b91c1c", fontWeight: "600", textTransform: "uppercase", marginBottom: "4px" }}>
                                    Reason / Description
                                </span>
                                <p style={{ fontSize: "15px", color: "#991b1b", margin: 0, lineHeight: "1.5" }}>
                                    {report.description || "No description provided."}
                                </p>
                            </div>

                            {/* Other Pending Reports (reasons) List */}
                            {other_reports.length > 0 && (
                                <div style={{ marginBottom: "24px" }}>
                                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--onBackground)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>group</span>
                                        Other pending reports for this item ({other_reports.length})
                                    </h4>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {other_reports.map((other) => (
                                            <div key={other.report_id} style={{ backgroundColor: "var(--surfaceContainerLow)", padding: "12px 16px", borderRadius: "6px", borderLeft: "3px solid var(--primary)", textAlign: "left" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                    <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--onBackground)" }}>
                                                        {other.user_id ? `User #${other.user_id}` : "AI Auto"}
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: "var(--textMuted)" }}>
                                                        {other.created_at}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "14px", color: "var(--onBackground)", margin: 0, lineHeight: "1.4" }}>
                                                    {other.description || "No description provided."}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "16px" }}>
                                <button
                                    onClick={() => handleAction("Approved")}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "none",
                                        backgroundColor: "#22c55e",
                                        color: "white",
                                        fontWeight: "600",
                                        fontSize: "15px",
                                        cursor: "pointer",
                                        transition: "background-color 0.2s"
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = "#16a34a"}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "#22c55e"}
                                >
                                    <span className="material-symbols-outlined">check</span>
                                    Approve Report (Delete Post)
                                </button>

                                <button
                                    onClick={() => handleAction("Rejected")}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: "8px",
                                        border: "1px solid #ef4444",
                                        backgroundColor: "transparent",
                                        color: "#ef4444",
                                        fontWeight: "600",
                                        fontSize: "15px",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = "#ef4444";
                                        e.target.style.color = "white";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = "transparent";
                                        e.target.style.color = "#ef4444";
                                    }}
                                >
                                    <span className="material-symbols-outlined">close</span>
                                    Reject Report (Keep Post)
                                </button>
                            </div>
                        </div>

                        {/* Reported Content detail card */}
                        <div className="tableCard" style={{ padding: "24px" }}>
                            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--onBackground)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>article</span>
                                Reported Content Details
                            </h3>

                            {post ? (
                                <div className="viewPostCard" style={{ boxShadow: "none", border: "1px solid #e2e8f0", backgroundColor: "#fff", marginBottom: 0 }}>
                                    <div className="viewPostHeader">
                                        <div className="viewPostAvatar">
                                            {post.username ? post.username.charAt(0).toUpperCase() : "?"}
                                        </div>
                                        <div className="viewPostUserInfo">
                                            <span className="viewPostUsername">{post.username || "Unknown User"}</span>
                                            <span className="viewPostTime">Posted on {post.timestamp}</span>
                                        </div>
                                        <div style={{ marginLeft: "auto" }}>
                                            <span className="idBadge">Post #{post.post_id}</span>
                                        </div>
                                    </div>

                                    {post.media_urls && post.media_urls.length > 0 ? (
                                        <div className="viewPostMedia">
                                            {post.media_urls.map((url, i) => {
                                                const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/) || url.includes('video');
                                                return isVideo ? (
                                                    <video 
                                                        key={i} 
                                                        src={url} 
                                                        controls
                                                        style={{ maxHeight: "400px", width: "auto", maxWidth: "100%", display: "block", margin: "0 auto 16px" }}
                                                    />
                                                ) : (
                                                    <img 
                                                        key={i} 
                                                        src={url} 
                                                        alt="Reported content" 
                                                        style={{ maxHeight: "400px", width: "auto", maxWidth: "100%", display: "block", margin: "0 auto 16px" }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : null}

                                    <h2 className="viewPostTitle" style={{ fontSize: "20px", marginTop: "12px" }}>{post.title || "No Title"}</h2>
                                    <p className="viewPostDescription" style={{ fontSize: "14px", color: "#475569" }}>{post.description}</p>
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "40px", color: "var(--textMuted)", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "#cbd5e1", marginBottom: "8px" }}>warning</span>
                                    <p style={{ margin: 0 }}>Post content is not available or has already been deleted.</p>
                                </div>
                            )}
                        </div>

                    </div>

                    <footer className="footer">
                        <span>© 2026 Sportify</span>
                    </footer>
                </main>
            </div>
        </>
    );
}
