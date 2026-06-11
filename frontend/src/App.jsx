import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { checkSession } from "./api/auth";
import { ToastContainer, toast } from "react-toastify";
import socket from "./api/socket";
import "react-toastify/dist/ReactToastify.css";

import { ChatProvider } from "./context/ChatContext.jsx";

/* AUTH PAGES */
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Logout from "./pages/Logout.jsx";

/* LAYOUTS */
import UserLayout from "./pages/UserLayout.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";

/* USER PAGES */
import FindPlayer from "./pages/FindPlayer.jsx";
import SportsCommunity from "./pages/SportsCommunity.jsx";
import Equipment from "./pages/Equipment.jsx";
import UserHomepage from "./pages/UserHomepage.jsx";
import FitGuides from "./pages/FitGuides.jsx";
import ViewPost from "./pages/ViewPost.jsx";
import Feedback from "./pages/Feedback.jsx";
import UserProfile from "./pages/UserProfile.jsx";
import CreatePost from "./pages/CreatePost.jsx";
import Chatbot from "./pages/Sporty.jsx";
import AllActivities from "./pages/AllActivities.jsx";
import JoinedActivities from "./pages/JoinedActivities.jsx";
import MyActivities from "./pages/MyActivities.jsx";
import CreateActivity from "./pages/CreateActivity.jsx";
import EditActivity from "./pages/EditActivity.jsx";

/* ADMIN PAGES */
import ManageCategory from "./pages/ManageCategory.jsx";
import AdminAds from "./pages/AdminAds.jsx";
import AdminFeedback from "./pages/AdminFeedback.jsx";
import AdminAnn from "./pages/AdminAnn.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import AdminHomepage from "./pages/AdminHomepage.jsx";
import AdminProfile from "./pages/AdminProfile.jsx";
import AddAds from "./pages/AddAds.jsx";
import EditAds from "./pages/EditAds.jsx";
import PostReport from "./pages/PostReport.jsx";
import UserEditProfile from "./pages/UserEditProfile.jsx";
import ReviewReports from "./pages/ReviewReports.jsx";
import ReportDetail from "./pages/ReportDetail.jsx";

import EditPost from "./pages/EditPost.jsx";

/* ROUTE GUARDS */
function RedirectWithToast({ to, message }) {
    useEffect(() => {
        toast.error(message);
    }, [message]);
    return <Navigate to={to} replace />;
}

function UserRoute({ user, children }) {
    if (!user || user.role !== "User") {
        return <RedirectWithToast to="/login" message="Please login to continue." />;
    }
    return children;
}

function AdminRoute({ user, children }) {
    if (!user || (user.role !== "Admin" && user.role !== "Superadmin")) {
        return <RedirectWithToast to="/login" message="Please login to continue." />;
    }
    return children;
}


export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await checkSession();
                const data = await response.json();

                if (data.loggedIn) {
                    const userData = {
                        userID: data.user_id,
                        role: data.role,
                    };

                    setUser(userData);

                } else {
                    setUser(null);
                }
            } catch (err) {
                console.error(err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, []);

    useEffect(() => {
        if (!user?.userID) return;

        socket.connect();

        const onConnect = () => {
            console.log("Socket connected:", socket.id);

            socket.emit("join_user", {
                userID: user.userID
            });
        };

        if (socket.connected) {
            onConnect();
        }

        socket.on("connect", onConnect);

        return () => {
            socket.off("connect", onConnect);
        };

    }, [user?.userID]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <BrowserRouter>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                theme="light"
            />

            <Routes>
                {/* DEFAULT */}
                <Route path="/" element={<Navigate to="/login" />} />

                {/* AUTH */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/logout" element={<Logout currentUser={user} />} />

                {/* USER AREA */}
                <Route
                    path="/user"
                    element={
                        <UserRoute user={user}>
                            <ChatProvider>
                                <UserLayout currentUser={user} />
                            </ChatProvider>
                        </UserRoute>
                    }
                >
                    <Route path="home" element={<UserHomepage currentUser={user}/>} />
                    <Route path="find-player" element={<FindPlayer currentUser={user} />} />
                    <Route path="sports-community" element={<SportsCommunity currentUser={user} />} />
                    <Route path="fitness-guides" element={<FitGuides />} />
                    <Route path="equipments" element={<Equipment currentUser={user} />} />
                    <Route path="profile" element={<UserProfile currentUser={user} />} />
                    <Route path="profile/:userId" element={<UserProfile currentUser={user} />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="post/:postId" element={<ViewPost currentUser={user} />} />
                    <Route path="post/edit/:postId" element={<EditPost currentUser={user} />} />
                    <Route path="sporty" element={<Chatbot />} />
                    <Route path="edit-profile" element={<UserEditProfile currentUser={user} setUser={setUser} />} />
                    <Route path="create-post" element={<CreatePost currentUser={user} />} />
                    <Route path="activities/all" element={<AllActivities />} />
                    <Route path="activities/joined" element={<JoinedActivities currentUser={user} />} />
                    <Route path="activities/my" element={<MyActivities currentUser={user} />} />
                    <Route path="activities/create" element={<CreateActivity currentUser={user} />} />
                    <Route path="activities/edit/:activity_id" element={<EditActivity currentUser={user} />} />
                </Route>

                {/* ADMIN AREA */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute user={user}>
                            <AdminLayout currentUser={user}/>
                        </AdminRoute>
                    }
                >
                    <Route path="home" element={<AdminHomepage />} />
                    <Route path="ads" element={<AdminAds />} />
                    <Route path="feedback" element={<AdminFeedback />} />
                    <Route path="ann" element={<AdminAnn />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="profile" element={<AdminProfile currentUser={user} />} />
                    <Route path="add-ads" element={<AddAds />} />
                    <Route path="edit-ads/:advertisement_id" element={<EditAds />} />
                    <Route path="reports/:user_id" element={<PostReport />} />
                    <Route path="categories" element={<ManageCategory />} />
                    <Route path="reviews" element={<ReviewReports />} />
                    <Route path="reviews/:report_id" element={<ReportDetail />} />
                </Route>

            </Routes>
        </BrowserRouter>
    );
}