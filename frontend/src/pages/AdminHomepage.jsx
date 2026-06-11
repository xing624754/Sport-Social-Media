import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import AdminLayout from "./AdminLayout.jsx";
import StatCard from "../components/StatCard";
import socket from "../api/socket";
import "../styles/AdminHomepage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function AdminHomepage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setloading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(
        new Date().toISOString().slice(0, 7) // "YYYY-MM"
    );

    const loadStats = () => {
        fetch(`/api/admin/analytics?month=${selectedMonth}`)
            .then(res => res.json())
            .then(data => {
                setAnalytics(data);
                setloading(false);
            })
            .catch(err => {
                console.error(err);
                setloading(false);
            });
    };

    useEffect(() => {
        setloading(true);
        loadStats();
    }, [selectedMonth]);

    useEffect(() => {
        socket.on("communities_updated", loadStats);
        socket.on("new_post_created", loadStats);

        return () => {
            socket.off("communities_updated", loadStats);
            socket.off("new_post_created", loadStats);
        };
    }, [selectedMonth]);

    if (loading || !analytics || !analytics.previous || !analytics.current) {
        return (
            <div className="dashboardContent layoutPaddingAdjustment">
                <h2>User Analytics</h2>
                <p>Loading Analytics...</p>
            </div>
        );
    }

    const chartData = {
        labels: ["Total Users", "Active Users", "New Users", "Total Comm.", "Active Comm.", "New Comm."],
        datasets: [
            {
                label: analytics.labels.previous,
                data: [
                    analytics.previous.totalUsers,
                    analytics.previous.activeUsers,
                    analytics.previous.newUsersThisMonth,
                    analytics.previous.totalCommunities,
                    analytics.previous.activeCommunities,
                    analytics.previous.newCommunitiesThisMonth,
                ],
                backgroundColor: "#cbd5e1", 
            },
            {
                label: analytics.labels.current,
                data: [
                    analytics.current.totalUsers,
                    analytics.current.activeUsers,
                    analytics.current.newUsersThisMonth,
                    analytics.current.totalCommunities,
                    analytics.current.activeCommunities,
                    analytics.current.newCommunitiesThisMonth,
                ],
                backgroundColor: "#0f172a", 
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, 
        // Checks if the window matchMedia printer query is active, changing orientation dynamically
        indexAxis: window.matchMedia("print").matches ? "y" : "x", 
        plugins: {
            legend: { position: "top" },
        },
    };

    return (
        <div className="dashboardContent layoutPaddingAdjustment">
            {/* Screen Header Controls (Hidden on Print) */}
            <div className="dashboardHeader">
                <div>
                    <h2>User Analytics</h2>
                    <p>Overview of user and community statistics</p>
                </div>
                <div className="headerActions">
                    <input
                        type="month"
                        className="analyticsMonthFilter"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                    <button className="printReportBtn" onClick={() => window.print()}>
                        Print Comparison Report
                    </button>
                </div>
            </div>

            {/* ==========================================================================
               1. PRINT-ONLY TWO-MONTH COMPARISON METRICS SUMMARY TABLE
               ========================================================================== */}
            <div className="printOnlySummary">
                <div className="printReportHeader">
                    <h2>Sportify – Monthly Analytics Comparison Report</h2>
                    <p>Comparing: <strong>{analytics.labels.current}</strong> vs <strong>{analytics.labels.previous}</strong></p>
                </div>

                <table className="comparisonPrintTable">
                    <thead>
                        <tr>
                            <th style={{ width: "40%" }}>Metric Category</th>
                            <th style={{ width: "20%" }}>{analytics.labels.previous} (Last Month)</th>
                            <th style={{ width: "20%" }}>{analytics.labels.current} (Selected Month)</th>
                            <th style={{ width: "20%" }}>Net Growth</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Total Platform Users</strong></td>
                            <td>{analytics.previous.totalUsers}</td>
                            <td>{analytics.current.totalUsers}</td>
                            <td>{analytics.current.totalUsers - analytics.previous.totalUsers}</td>
                        </tr>
                        <tr>
                            <td><strong>Active Engagement Users</strong></td>
                            <td>{analytics.previous.activeUsers}</td>
                            <td>{analytics.current.activeUsers}</td>
                            <td>{analytics.current.activeUsers - analytics.previous.activeUsers}</td>
                        </tr>
                        <tr>
                            <td><strong>New Users Registered</strong></td>
                            <td>{analytics.previous.newUsersThisMonth}</td>
                            <td>{analytics.current.newUsersThisMonth}</td>
                            <td>{analytics.current.newUsersThisMonth - analytics.previous.newUsersThisMonth}</td>
                        </tr>
                        <tr>
                            <td><strong>Total Communities Created</strong></td>
                            <td>{analytics.previous.totalCommunities}</td>
                            <td>{analytics.current.totalCommunities}</td>
                            <td>{analytics.current.totalCommunities - analytics.previous.totalCommunities}</td>
                        </tr>
                        <tr>
                            <td><strong>Active Communities (With Posts)</strong></td>
                            <td>{analytics.previous.activeCommunities}</td>
                            <td>{analytics.current.activeCommunities}</td>
                            <td>{analytics.current.activeCommunities - analytics.previous.activeCommunities}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ==========================================================================
               2. STANDARD WEB HOMEPAGE METRICS VISUAL CARDS (Hidden on Print Layout)
               ========================================================================== */}
            <div className="webOnlyVisuals">
                <div className="analyticsSection">
                    <h3 className="sectionTitle">User Metrics</h3>
                    <div className="statsCards">
                        <div className="statsCard">
                            <span className="cardLabel">Total Users (As of {selectedMonth})</span>
                            <h2>{analytics.current.totalUsers}</h2>
                        </div>
                        <div className="statsCard">
                            <span className="cardLabel">Active Users</span>
                            <h2>{analytics.current.activeUsers}</h2>
                        </div>
                        <div className="statsCard">
                            <span className="cardLabel">New Users This Month</span>
                            <h2>{analytics.current.newUsersThisMonth}</h2>
                        </div>
                    </div>
                </div>

                <div className="analyticsSection">
                    <h3 className="sectionTitle">Communities</h3>
                    <div className="statsCards">
                        <div className="statsCard">
                            <span className="cardLabel">Total Communities (As of {selectedMonth})</span>
                            <h2>{analytics.current.totalCommunities}</h2>
                        </div>
                        <div className="statsCard">
                            <span className="cardLabel">Active Communities</span>
                            <h2>{analytics.current.activeCommunities}</h2>
                        </div>
                        <div className="statsCard">
                            <span className="cardLabel">New Communities This Month</span>
                            <h2>{analytics.current.newCommunitiesThisMonth}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* ==========================================================================
               3. COMPARISON CHART GRAPH (Shared displaying engine)
               ========================================================================== */}
            <div className="reportChartSection">
                <h3 className="sectionTitle">Growth Comparison Chart</h3>
                <div className="chartWrapper">
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* ==========================================================================
               4. SEQUENTIAL DATA TABLES BREAKDOWN
               ========================================================================== */}
            <div className="analyticsTables sequentialLayout">
                <div className="analyticsTableCard">
                    <div className="tableHeader">
                        <h4>Latest Communities ({analytics.labels.current})</h4>
                    </div>
                    <div className="tableScroll printableTableContainer">
                        <table className="reportTable">
                            <thead>
                                <tr>
                                    <th style={{ width: "15%" }}>#</th>
                                    <th style={{ width: "50%" }}>Community Name</th>
                                    <th style={{ width: "35%" }}>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.latestCommunities.length > 0 ? (
                                    analytics.latestCommunities.map((c, i) => (
                                        <tr key={c.community_id}>
                                            <td>{i + 1}</td>
                                            <td>{c.name}</td>
                                            <td>{new Date(c.created_date).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3">No communities registered this month.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="analyticsTableCard">
                    <div className="tableHeader">
                        <h4>Active Communities ({analytics.labels.current} Posts)</h4>
                    </div>
                    <div className="tableScroll printableTableContainer">
                        <table className="reportTable">
                            <thead>
                                <tr>
                                    <th style={{ width: "15%" }}>#</th>
                                    <th style={{ width: "50%" }}>Community Name</th>
                                    <th style={{ width: "35%" }}>Newly Created Posts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.trendingCommunities.length > 0 ? (
                                    analytics.trendingCommunities.map((c, i) => (
                                        <tr key={c.community_id}>
                                            <td>{i + 1}</td>
                                            <td>{c.name}</td>
                                            <td>{c.members}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3">No active post engagement recorded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminHomepage;