import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "../components/UserSidebar";
import UserTopbar from "../components/UserTopbar";
import Chat from "./Chat";
import socket from "../api/socket";
import { toast } from "react-toastify";

import "../styles/UserCommon.css";

function UserLayout({ currentUser }) {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        if (!currentUser?.userID) return;

        const handleJoinNotification = (data) => {
            toast.info(data.message);
        };

        socket.on("join_request_notification", handleJoinNotification);
        socket.emit("join_user", { userID: currentUser.userID });
        return () => {
            socket.off("join_request_notification", handleJoinNotification);
            socket.emit("leave_user", { userID: currentUser.userID });
        };
    }, [currentUser]);

    return (
        <div className="userContainer">
            <UserSidebar isOpen={isOpen} toggleSidebar={() => setIsOpen(!isOpen)} />

            <div className="userMain">
                <UserTopbar currentUser={currentUser}/>

                <div className ="userContent">
                    <Outlet />
                </div>
            </div>

            <Chat currentUser={currentUser} />
        </div>
    );
}

export default UserLayout;