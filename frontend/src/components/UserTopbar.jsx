import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Sportify.png";
import axios from "axios";
import socket from "../api/socket";

function UserTopbar({ currentUser }) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
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

    const profileImage = profileData?.profile_pic
        ? `http://localhost:5000${profileData.profile_pic}`
        : "http://localhost:5000/uploads/profile_pics/user.png";

    const formatTime = (t) => {
        const d = new Date(t);
        return isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
    };

    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get("/api/user/notification-count", {
                withCredentials: true
            });
            setUnreadCount(res.data.unreadNotificationCount || 0);
        } catch (err) {
            console.error(err);
        }
    };

    const loadNotifications = async (pageNum = 1, append = false) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            const res = await axios.get(
                `/api/user/notifications?page=${pageNum}&limit=10`,
                { withCredentials: true }
            );

            const rawN = Array.isArray(res.data.notifications) ? res.data.notifications : [];
            const rawA = Array.isArray(res.data.announcements) ? res.data.announcements : [];

            const merged = [
                ...rawN.map(n => ({
                    id: `n-${n.id}`,
                    type: "notification",
                    content: n.content,
                    status: n.status,
                    timestamp: n.timestamp
                })),
                ...rawA.map(a => ({
                    id: `a-${a.id}`,
                    type: "announcement",
                    title: a.title,
                    content: a.content,
                    file_url: a.file_url,
                    status: a.status,
                    timestamp: a.timestamp
                }))
            ];

            merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setNotifications(prev => append ? [...prev, ...merged] : merged);

            // True pagination check: if BOTH arrays came back shorter than limit, we're out of items
            if (rawN.length < 10 && rawA.length < 10) {
                setHasMore(false);
            }
        } catch (err) {
            console.error("Error loading notifications:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBellClick = async () => {
        const next = !showNotifications;
        setShowNotifications(next);
        if (next) {
            setPage(1);
            setHasMore(true);
            await loadNotifications(1, false);

            try {
                await axios.put(
                    "/api/user/notifications/read",
                    { all: true },
                    { withCredentials: true }
                );
                setUnreadCount(0);
                setNotifications(prev => prev.map(n => ({ ...n, status: "read" })));
            } catch (err) {
                console.error("Failed to mark all notifications as read:", err);
            }
        }
    };

    const markAsRead = async (id, type) => {
        try {
            await axios.put(
                "/api/user/notifications/read",
                { id, type },
                { withCredentials: true }
            );
            fetchUnreadCount();
            // Update status locally so UI reflects changes instantly
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, status: "read" } : n)
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleScroll = () => {
        if (!listRef.current || !hasMore || isLoading) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;

        if (scrollTop + clientHeight >= scrollHeight - 15) {
            const next = page + 1;
            setPage(next);
            loadNotifications(next, true);
        }
    };

    useEffect(() => {
        const handleOutside = (e) => {
            if (notificationRef.current && !notificationRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    useEffect(() => {
        fetchUnreadCount();

        const handleNotifUpdate = () => {
            fetchUnreadCount();
            if (showNotifications) {
                loadNotifications(1, false);
            }
        };

        socket.on("join_request_notification", handleNotifUpdate);
        socket.on("announcements_updated", handleNotifUpdate);

        return () => {
            socket.off("join_request_notification", handleNotifUpdate);
            socket.off("announcements_updated", handleNotifUpdate);
        };
    }, [showNotifications]);

    return (
        <div className="userTopbar">
            <div className="topbarLeft">
                <div className="logo" onClick={() => navigate("/user/home")}>
                    <img src={logo} alt="Logo" />
                    <span className="logoName">Sportify</span>
                </div>
            </div>

            <div className="topbarRight">
                <div className="notificationWrapper" ref={notificationRef}>
                    <div className="iconBtn" onClick={handleBellClick}>
                        <span className="material-symbols-outlined" style={{ fontSize: "32px", lineHeight: "60px" }}>
                            notifications
                        </span>
                        {unreadCount > 0 && (
                            <span className="notificationBadge">{unreadCount}</span>
                        )}
                    </div>

                    {showNotifications && (
                        <div
                            className="notificationPanel"
                            ref={listRef}
                            onScroll={handleScroll}
                        >
                            <div className="notificationHeader">Notifications</div>

                            {notifications.length === 0 && !isLoading && (
                                <div className="notificationEmpty">No notifications yet</div>
                            )}

                            {notifications.map(item => (
                                <div
                                    key={item.id}
                                    className={`notificationItem clickable ${item.status === 'unread' ? 'unread' : ''}`}
                                    onClick={() => {
                                        if (item.type === "announcement") {
                                            setSelectedAnnouncement(item);
                                        }
                                        if (item.status === "unread" || item.status === "Unread") {
                                            markAsRead(item.id, item.type);
                                        }
                                    }}
                                >
                                    {item.type === "announcement" && (
                                        <span className="typeTag announcement">Announcement</span>
                                    )}

                                    {item.status === "unread" && <span className="unreadDot"></span>}
                                    
                                    <div className="notificationText">
                                        {item.type === "announcement" ? (
                                            <>
                                                <strong style={{ display: "block", marginBottom: "3px", color: "#1e293b" }}>
                                                    {item.title}
                                                </strong>
                                                <div style={{ color: "#475569" }}>{item.content}</div>
                                            </>
                                        ) : (
                                            <div>{item.content}</div>
                                        )}
                                    </div>

                                    <div className="notificationTime">
                                        {formatTime(item.timestamp)}
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div style={{ textAlign: "center", padding: "10px", color: "#64748b", fontSize: "12px" }}>
                                    Loading older notifications...
                                </div>
                            )}

                            {!hasMore && notifications.length > 0 && (
                                <div style={{ textAlign: "center", padding: "14px", color: "#94a3b8", fontSize: "12px", borderTop: "1px solid #f1f5f9" }}>
                                    No more notifications
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="profileWrapper" onClick={() => navigate("/user/profile")} style={{ cursor: "pointer" }}>
                    <img
                        src={profileImage}
                        alt="profile"
                        className="userPic"
                        onError={(e) => {
                            e.target.src = "/uploads/profile_pics/user.png";
                        }}
                    />
                </div>
            </div>

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

export default UserTopbar;