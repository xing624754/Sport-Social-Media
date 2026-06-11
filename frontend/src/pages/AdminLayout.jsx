import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";

import "../styles/AdminCommon.css";

function AdminLayout({ currentUser }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="adminContainer">

            <AdminSidebar
                isOpen={isOpen}
                toggleSidebar={() => setIsOpen(!isOpen)}
            />

            <div className="adminMain">

                <AdminTopbar 
                    isOpen={isOpen}
                    currentUser={currentUser}
                />

                <div className="adminContent">
                    <Outlet />
                </div>

            </div>

        </div>
    );
}

export default AdminLayout;