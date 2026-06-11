import { useEffect, useState } from "react";
import { createMemoryRouter, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    Eye,
    Snowflake,
    Check,
    Trash,
    Plus
} from "lucide-react";
import socket from "../api/socket";
import "../styles/UserManagement.css";

function UserManagement() {

    const navigate = useNavigate();

    const [admins, setAdmins] = useState([]);
    const [role, setRole] = useState(null);

    const [newAdmin, setNewAdmin] = useState({
        username: "",
        password: "",
        email: "",
        gender: "",
        birthdate: ""
    });

    const [showAdminForm, setShowAdminForm] = useState(false);

    const [activeTab, setActiveTab] = useState("reports");

    const [postReports, setPostReports] = useState([]);

    const [accountReports, setAccountReports] = useState([]);

    const [showAccountModal, setShowAccountModal] = useState(false);

    const [selectedAccountReport, setSelectedAccountReport] = useState(null);

    useEffect(() => {
        fetchRole();
    }, []);


    useEffect(() => {
        if(!role) return;

        fetchPostReports();
        fetchAccountReports();

        if (role === "Superadmin") {
            fetchAdmins();
        }
        

    }, [role]);

    useEffect(() => {
        if (!role) return;

        const handleUsersUpdated = () => {
            if (role === "Superadmin") {
                fetchAdmins();
            }
            fetchPostReports();
            fetchAccountReports();
        };

        const handleReportsUpdated = () => {
            fetchPostReports();
            fetchAccountReports();
        };

        socket.on("reports_updated", handleReportsUpdated);

        return () => {
            socket.off("reports_updated", handleReportsUpdated);
        };
    }, [role]);


    async function fetchRole() {
        try {
            const res = await axios.get(
                "/api/user-management/role",
                { withCredentials: true }
            );

            setRole(res.data.role);

        } catch (err) {
            console.log(err);
        }
    }

    // fetch admin list 
    async function fetchAdmins() {
        try {
            const res = await axios.get("/api/admins", {
                withCredentials: true
            });

            setAdmins(res.data.admins);
        } catch (err) {
            console.log(err);
            alert(err.response?.data?.error || "Failed to load admins");
        }
    }

    async function createAdmin() {
        try {
            await axios.post("/api/admins", newAdmin, {
                withCredentials: true
            });

            alert("Admin created successfully");

            setNewAdmin({
                username: "",
                password: "",
                email: "",
                gender: "",
                birthdate: ""
            });

            setShowAdminForm(false);
            fetchAdmins();

        } catch (err) {
            alert(err.response?.data?.error || "Failed to create admin");
        }
    }

    async function deleteAdmin(userId, username) {
        const confirmDelete = window.confirm(
            `Delete admin ${username}?`
        );

        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/admins/${userId}`, {
                withCredentials: true
            });

            alert("Admin deleted");
            fetchAdmins();

        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete admin");
        }
    }


    // FETCH POST REPORTS
    async function fetchPostReports() {

        try {

            const response = await axios.get(
                "/api/report-summary",
                {
                    withCredentials:true
                }
            );

            setPostReports(response.data.reports);

        } catch (error) {

            console.log(error);

        }
    }

    // FETCH ACCOUNT REPORTS
    async function fetchAccountReports() {

        try {

            const response = await axios.get(
                "/api/account-reports",
                {
                    withCredentials:true
                }
            );

            setAccountReports(response.data.reports);

        } catch (error) {

            console.log(error);

        }
    }

    // VIEW ACCOUNT REPORT DETAILS
    async function viewAccountReportDetails(reportID) {

        try {

            const response = await axios.get(
                `/api/account-report-details/${reportID}`,
                {
                    withCredentials:true
                }
            );

            setSelectedAccountReport(
                response.data.report
            );

            setShowAccountModal(true);

        } catch (error) {

            alert(
                error.response?.data?.error ||
                "Something went wrong"
            );

        }
    }

    // FREEZE ACCOUNT
    async function freezeAccount(
        userID,
        username,
        totalReports
    ) {

        let freezeDays = 0;
        let isDelete = false;

        if (totalReports > 10) {
            isDelete = true;
        } else if (totalReports >= 9) {
            freezeDays = 365;
        } else if (totalReports >= 5) {
            freezeDays = 30;
        } else if (totalReports >= 3) {
            freezeDays = 14;
        } else {
            alert("No penalty threshold reached");
            return;
        }

        let confirmMessage = "";
        if (isDelete) {
            confirmMessage = `Delete ${username}'s account permanently?\n\n` +
                `This user has ${totalReports} approved reports (exceeding the limit of 10).\n` +
                `This action will soft-delete the user's account.\n\n` +
                `Proceed with deletion?`;
        } else {
            confirmMessage = `Freeze ${username}'s account?\n\n` +
                `Freeze Duration: ${freezeDays} days\n\n` +
                `The user will NOT be able to:\n\n` +
                `• Create posts\n` +
                `• Like posts\n` +
                `• Comment\n` +
                `• Send messages\n\n` +
                `Proceed with freeze action?`;
        }

        const confirmAction = window.confirm(confirmMessage);
        if (!confirmAction) return;

        try {

            const response = await axios.put(
                `/api/freeze-account/${userID}`,
                {},
                {
                    withCredentials:true
                }
            );

            if (response.data.action === "Deleted") {
                alert(`${username}'s account has been successfully deleted.`);
            } else {
                alert(
                    `${username} frozen until ${response.data.freeze_until} (${response.data.freeze_days} days added)`
                );
            }

            fetchPostReports();

        } catch (error) {

            alert(
                error.response?.data?.error ||
                "Something went wrong"
            );

        }
    }

    // REVIEW REPORT
    async function reviewReport(
        reportID,
        status,
        username
    ) {

        let freezeText = "";

        if (status === "Approved") {

            freezeText =
                "\n\nPenalty may include account freeze.";

        }

        const confirmAction = window.confirm(
            `${status} report against ${username}?${freezeText}`
        );

        if (!confirmAction) return;

        try {

            await axios.put(
                `/api/review-report/${reportID}`,
                { status },
                {
                    withCredentials:true
                }
            );

            alert(`Report ${status}`);

            fetchAccountReports();

            fetchPostReports();

            setShowAccountModal(false);

        } catch (error) {

            alert(
                error.response?.data?.error ||
                "Something went wrong"
            );

        }
    }

    return (
        <div className="user-management-page">

            <h1>User Management</h1>

            <div className="report-management-wrapper">

                {/* TABS */}
                {role === "Superadmin" && (
                    <div className="tabs">
                        <button
                            className={activeTab === "reports" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("reports")}
                        >
                            Report Management
                        </button>

                        <button
                            className={activeTab === "admins" ? "tab active" : "tab"}
                            onClick={() => setActiveTab("admins")}
                        >
                            Admin Management
                        </button>
                    </div>
                )}

                {/* ADMIN SECTION */}
                {role === "Superadmin" && activeTab === "admins" && (
                    <div className="admin-management-section">

                        <div className="section-header">
                            <div>
                                <h2>Admin Management</h2>
                                <p>Create and manage administrators</p>
                            </div>

                            <button
                                className="add-admin-btn"
                                onClick={() => setShowAdminForm(!showAdminForm)}
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {showAdminForm && (
                            <div className="admin-form">

                                <input
                                    placeholder="Username"
                                    value={newAdmin.username}
                                    onChange={(e) =>
                                        setNewAdmin({ ...newAdmin, username: e.target.value })
                                    }
                                />

                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={newAdmin.password}
                                    onChange={(e) =>
                                        setNewAdmin({ ...newAdmin, password: e.target.value })
                                    }
                                />

                                <input
                                    placeholder="Email"
                                    value={newAdmin.email}
                                    onChange={(e) =>
                                        setNewAdmin({ ...newAdmin, email: e.target.value })
                                    }
                                />

                                <select
                                    value={newAdmin.gender}
                                    onChange={(e) =>
                                        setNewAdmin({ ...newAdmin, gender: e.target.value })
                                    }
                                >
                                    <option value="">Gender</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>

                                <input
                                    type="date"
                                    value={newAdmin.birthdate}
                                    onChange={(e) =>
                                        setNewAdmin({ ...newAdmin, birthdate: e.target.value })
                                    }
                                />

                                <button onClick={createAdmin}>
                                    Create Admin
                                </button>

                            </div>
                        )}

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th>Join Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {admins.map((admin) => (
                                        <tr key={admin.user_id}>
                                            <td>{admin.username}</td>
                                            <td>{admin.email}</td>
                                            <td>
                                                <span className={
                                                    admin.status === "Frozen"
                                                        ? "status-frozen"
                                                        : "status-active"
                                                }>
                                                    {admin.status}
                                                </span>
                                            </td>
                                            <td>
                                                {new Date(admin.join_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="remove-action">
                                                    <button
                                                        className="action-btn reject-btn"
                                                        onClick={() =>
                                                            deleteAdmin(admin.user_id, admin.username)
                                                        }
                                                    >
                                                        <Trash size={18} />
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>

                    </div>
                )}

                {/* REPORT SECTION WRAPPER */}
                {(role !== "Superadmin" || activeTab === "reports") && (
                    <div className="reports-wrapper">

                        {/* POST REPORTS */}
                        <div className="report-management-section">

                            <div className="section-header">
                                <div>
                                    <h2>Post Report Management</h2>
                                    <p>Review and manage post-related community violations</p>
                                </div>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Reports</th>
                                            <th>Account Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {postReports.map((report) => (
                                            <tr key={report.user_id}>
                                                <td>{report.username}</td>
                                                <td>{report.total_reports}</td>
                                                <td>
                                                    <span className={
                                                        report.status === "Frozen"
                                                            ? "status-frozen"
                                                            : "status-active"
                                                    }>
                                                        {report.status}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="action-buttons">

                                                        <button
                                                            className="action-btn view-btn"
                                                            onClick={() =>
                                                                navigate(`/admin/reports/${report.user_id}`)
                                                            }
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>

                                                        <button
                                                            className="action-btn freeze-btn"
                                                            onClick={() =>
                                                                freezeAccount(
                                                                    report.user_id,
                                                                    report.username,
                                                                    report.total_reports
                                                                )
                                                            }
                                                        >
                                                            <Snowflake size={16} />
                                                            Freeze
                                                        </button>

                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>

                        </div>

                        {/* ACCOUNT REPORTS */}
                        <div className="report-management-section">

                            <div className="section-header">
                                <div>
                                    <h2>Account Report Management</h2>
                                    <p>Review reported accounts</p>
                                </div>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Reporter</th>
                                            <th>Reported User</th>
                                            <th>Report Status</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {accountReports.map((report) => (
                                            <tr key={report.report_id}>
                                                <td>{report.reporter_name}</td>
                                                <td>{report.reported_name}</td>
                                                <td>
                                                    <span className={
                                                        report.status === "Approved"
                                                            ? "status-active"
                                                            : report.status === "Rejected"
                                                                ? "status-frozen"
                                                                : "status-pending"
                                                    }>
                                                        {report.status}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn view-btn"
                                                            onClick={() =>
                                                                viewAccountReportDetails(report.report_id)
                                                            }
                                                        >
                                                            <Eye size={16} />
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>

                        </div>

                    </div>
                )}

            </div>

            {/* MODAL */}
            {showAccountModal && selectedAccountReport && (
                <div className="report-modal-overlay">

                    <div className="report-modal">

                        <div className="modal-header">
                            <h2>Account Report Detail</h2>

                            <button onClick={() => setShowAccountModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="modal-body">

                            <div className="report-card">

                                <p><strong>Reported User:</strong> {selectedAccountReport.reported_name}</p>
                                <p><strong>Reporter:</strong> {selectedAccountReport.reporter_name}</p>
                                <p><strong>Reason:</strong> {selectedAccountReport.description}</p>
                                <p><strong>Status:</strong> {selectedAccountReport.status}</p>

                                {selectedAccountReport.status === "Pending" && (
                                    <div className="action-buttons">

                                        <button
                                            className="approve-btn"
                                            onClick={() =>
                                                reviewReport(
                                                    selectedAccountReport.report_id,
                                                    "Approved",
                                                    selectedAccountReport.reported_name
                                                )
                                            }
                                        >
                                            Approve
                                        </button>

                                        <button
                                            className="reject-btn"
                                            onClick={() =>
                                                reviewReport(
                                                    selectedAccountReport.report_id,
                                                    "Rejected",
                                                    selectedAccountReport.reported_name
                                                )
                                            }
                                        >
                                            Reject
                                        </button>

                                    </div>
                                )}

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default UserManagement;