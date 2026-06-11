import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../api/socket";
import "../styles/ManageCategory.css";

export default function ReviewReports() {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("User");

    // Fetch reports on mount
    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/review-report");
            if (!res.ok) throw new Error("Failed to fetch reports");
            const result = await res.json();
            setReports(result.data || []);
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();

        socket.on("reports_updated", fetchReports);
        return () => {
            socket.off("reports_updated", fetchReports);
        };
    }, []);

    const handleAction = async (reportId, action) => {
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

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || `Failed to update report status.`);
                return;
            }

            alert(`Report successfully ${action.toLowerCase()}!`);
            fetchReports();
        } catch (err) {
            console.error("Action error:", err);
            alert("Network error. Please try again.");
        }
    };

    // Split reports into User-submitted and AI-generated
    const userReports = reports.filter(r => r.user_id !== null);
    const aiReports = reports.filter(r => r.user_id === null);

    // Get current tab items
    const currentTabReports = activeTab === "User" ? userReports : aiReports;

    return (
        <>
            <div className="manageCategoryPage">
                <main className="mainContent">
                    {/* Dashboard Header */}
                    <div className="dashboardHeader">
                        <div>
                            <h2 className="headerTitle">Report Moderation</h2>
                            <p className="headerDesc">
                                Review flagged content. Approve reports to remove the content or Reject to dismiss.
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation with counts */}
                    <div className="tabsNav">
                        <button
                            className={`tab ${activeTab === "User" ? "active" : ""}`}
                            onClick={() => setActiveTab("User")}
                        >
                            <span className="material-symbols-outlined">shield_person</span>
                            User Reports ({userReports.length})
                        </button>
                        <button
                            className={`tab ${activeTab === "AI" ? "active" : ""}`}
                            onClick={() => setActiveTab("AI")}
                        >
                            <span className="material-symbols-outlined">smart_toy</span>
                            AI Reports ({aiReports.length})
                        </button>
                    </div>

                    {/* Table Card */}
                    <div className="tableCard">
                        <div className="tableResponsive">
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "40px", color: "var(--textMuted)" }}>
                                    Loading reports...
                                </div>
                            ) : (
                                <table className="dataTable">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "80px" }}>ID</th>
                                            <th style={{ width: "120px" }}>Type</th>
                                            <th style={{ width: "150px" }}>Reported Item</th>
                                            <th>Reason / Description</th>
                                            <th style={{ width: "120px" }}>Reporter</th>
                                            <th style={{ width: "120px" }}>Admin ID</th>
                                            <th style={{ width: "180px" }}>Date Reported</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentTabReports.map((report) => (
                                            <tr
                                                key={report.report_id}
                                                onClick={() => navigate(`/admin/reviews/${report.report_id}`)}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <td>
                                                    <span className="idBadge">#{report.report_id}</span>
                                                </td>
                                                <td>
                                                    <span className="textSemibold">{report.type}</span>
                                                </td>
                                                <td>
                                                   <span className="textSemibold">Post #{report.post_id}</span>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: "14px", lineHeight: "1.4", color: "var(--onBackground)" }}>
                                                        {report.description}
                                                    </span>
                                                </td>
                                                <td>
                                                    {report.user_id ? (
                                                        <span style={{ fontSize: "14px" }}>User #{report.user_id}</span>
                                                    ) : (
                                                        <span style={{
                                                            color: "var(--primary)",
                                                            fontWeight: "700",
                                                            fontSize: "11px",
                                                            textTransform: "uppercase",
                                                            backgroundColor: "var(--surfaceContainerLow)",
                                                            padding: "4px 8px",
                                                            borderRadius: "4px"
                                                        }}>
                                                            AI Auto
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: "14px", color: "var(--onBackground)" }}>
                                                        {report.admin_id ? `Admin #${report.admin_id}` : "-"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ color: "var(--textMuted)", fontSize: "13px" }}>
                                                        {report.created_at}
                                                    </span>
                                                </td>

                                            </tr>
                                        ))}

                                        {currentTabReports.length === 0 && (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--textMuted)" }}>
                                                    No pending {activeTab.toLowerCase()} reports found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="tableFooter">
                            <span className="footerStats">
                                Showing {currentTabReports.length} reports
                            </span>
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
