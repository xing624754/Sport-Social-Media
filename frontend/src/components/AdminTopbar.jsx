import { useEffect, useState, useRef } from "react";
import logo from "../assets/Sportify.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../api/socket";

function AdminTopbar({ currentUser, isOpen }) {
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const notificationRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        if (!currentUser?.userID) return;

        const fetchProfile = async () => {
            try {
                const res = await axios.get(
                    `/api/profile/${currentUser.userID}`,
                    { withCredentials: true }
                );
                setProfileData(res.data.user);
            } catch (err) {
                console.error(err);
            }
        };

        fetchProfile();
    }, [currentUser]);

    const getInitial = () => {
        const name = profileData?.username || currentUser?.username || "";
        return name.trim().charAt(0).toUpperCase() || "A";
    };

    const profileImage = profileData?.profile_pic
        ? `${profileData.profile_pic}?t=${Date.now()}`
        : "/uploads/profile_pics/user.png";

    const formatTime = (t) => {
        const d = new Date(t);
        return isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
    };

    // FETCH NOTIFICATION COUNT
    const fetchNotificationCount = async () => {
        try {
            const response = await axios.get(
                "/api/admin/notification-count",
                { withCredentials: true }
            );
            setUnreadNotificationCount(response.data.unreadNotificationCount || 0);
        } catch (error) {
            console.error(error);
        }
    };

    // FETCH NOTIFICATIONS
    const fetchNotifications = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get(
                "/api/admin/notifications",
                { withCredentials: true }
            );

            const rawA = Array.isArray(response.data.announcements) ? response.data.announcements : [];

            const mappedAnnouncements = rawA.map(a => ({
                id: `a-${a.announcement_id}`,
                type: "announcement",
                title: a.title,
                content: a.content,
                file_url: a.file_url,
                status: a.status,
                timestamp: a.timestamp
            }));

            mappedAnnouncements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setNotifications(mappedAnnouncements);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // MARK SINGLE SELECTION AS READ
    const markNotificationAsRead = async (id) => {
        try {
            await axios.put(
                "/api/admin/notifications/read",
                { id: id },
                { withCredentials: true }
            );

            fetchNotificationCount();

            setNotifications(prev =>
                prev.map(item => item.id === id ? { ...item, status: "read" } : item)
            );
        } catch (error) {
            console.error(error);
        }
    };

    // TOGGLE NOTIFICATION PANEL
    const handleNotificationClick = async () => {
        const nextState = !showNotifications;
        setShowNotifications(nextState);

        if (nextState) {
            await fetchNotifications();
        }
    };

    // CLOSE DROPDOWN OUTSIDE
    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(event.target)
            ) {
                setShowNotifications(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    // INITIAL LOAD
    useEffect(() => {
        fetchNotificationCount();

        const handleAnnouncementsUpdate = () => {
            fetchNotificationCount();
            if (showNotifications) {
                fetchNotifications();
            }
        };

        socket.on("announcements_updated", handleAnnouncementsUpdate);
        return () => {
            socket.off("announcements_updated", handleAnnouncementsUpdate);
        };
    }, [showNotifications]);

    return (
        <div className="adminTopbar">
            <div className="topbarLeft">
                <div className="logo" onClick={() => navigate("/admin/home")}>
                    <img
                        src={logo}
                        alt="Logo"
                        className={isOpen ? "logoExpanded" : "logoCollapsed"}
                    />
                    <span className="logoName">Sportify</span>
                </div>
            </div>

            <div className="topbarRight">
                {/* NOTIFICATIONS */}
                <div className="notificationWrapper" ref={notificationRef}>
                    <div className="iconBtn" onClick={handleNotificationClick}>
                        <span className="material-symbols-outlined" style={{ fontSize: "32px", lineHeight: "60px" }}>
                            notifications
                        </span>
                        {unreadNotificationCount > 0 && (
                            <span className="notificationBadge">{unreadNotificationCount}</span>
                        )}
                    </div>

                    {/* DROPDOWN */}
                    {showNotifications && (
                        <div className="notificationPanel" ref={listRef}>
                            <div className="notificationHeader">System Announcements</div>

                            {notifications.length === 0 && !isLoading && (
                                <div className="notificationEmpty">No announcements posted yet</div>
                            )}

                            {notifications.map((item) => (
                                <div
                                    key={item.id}
                                    className={`notificationItem clickable ${item.status === 'unread' ? 'unread' : ''}`}
                                    onClick={() => {
                                        setSelectedAnnouncement(item);
                                        if (item.status === "unread" || item.status === "Unread") {
                                            markNotificationAsRead(item.id);
                                        }
                                    }}
                                >
                                    {/* Left Sub-Container: Clusters text streams tightly over the left margin */}
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div className="notificationText">
                                            <strong style={{ display: "block", marginBottom: "3px", color: "#1e293b" }}>
                                                {item.title}
                                            </strong>
                                            <div style={{ color: "#475569" }}>{item.content}</div>
                                        </div>

                                        <div className="notificationTime">
                                            {formatTime(item.timestamp)}
                                        </div>
                                    </div>

                                    {/* Right Sub-Container: Keeps elements side-by-side on the right edge */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                                        <span className="typeTag announcement">Announcement</span>
                                        {item.status === "unread" && (
                                            <span
                                                className="unreadDot"
                                                style={{ position: "static", transform: "none" }}
                                            ></span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div style={{ textAlign: "center", padding: "12px", color: "#64748b", fontSize: "12px" }}>
                                    Loading announcements...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* PROFILE */}
                <div
                    className="profileContainer"
                    onClick={() => navigate("/admin/profile")}
                    style={{ cursor: "pointer" }}
                >
                    {profileData?.profile_pic ? (
                        <img
                            src={profileImage}
                            alt="profile"
                            className="adminPic"
                        />
                    ) : (
                        <div className="adminProfileCircle">
                            {getInitial()}
                        </div>
                    )}
                </div>
            </div>

            {/* DETAIL MODAL OVERLAY BOX */}
            {selectedAnnouncement && (
                <div className="announcementOverlay" onClick={() => setSelectedAnnouncement(null)}>
                    <div className="announcementModal" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedAnnouncement.title}</h2>
                        <div className="notificationTime" style={{ marginBottom: "15px" }}>
                            {formatTime(selectedAnnouncement.timestamp)}
                        </div>
                        {selectedAnnouncement.file_url && (
                            <img
                                src={`http://localhost:5000${selectedAnnouncement.file_url}`}
                                alt="announcement"
                                className="announcementImage"
                            />
                        )}
                        <p style={{ marginTop: "15px", color: "#334155", lineHeight: "1.6" }}>
                            {selectedAnnouncement.content}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminTopbar;