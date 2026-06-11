import { logout } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import socket from "../api/socket";


export default function Logout({ currentUser }) {
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser?.userID) return;

        const doLogout = async () => {
            socket.emit("leave_user", { userID: currentUser.userID });
            const response = await logout();

            if (response.ok) {
                socket.removeAllListeners();
                socket.off();
                socket.disconnect();
                window.location.href = "/login";
            }
        };

        doLogout();
    }, [currentUser]);

    return null;
};