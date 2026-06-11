import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import {
    LayoutDashboard,
    Users,
    Shapes,
    Megaphone,
    FileSearch,
    MessageSquareMore,
    Bell
} from "lucide-react";

function AdminSidebar({ isOpen, toggleSidebar }) {

    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            name: "Homepage",
            path: "/admin/home",
            icon: <LayoutDashboard size={22} />
        },
        {
            name: "User Management",
            path: "/admin/users",
            icon: <Users size={22} />
        },
        {
            name: "Manage Category",
            path: "/admin/categories",
            icon: <Shapes size={22} />
        },
        {
            name: "Ads Posting",
            path: "/admin/ads",
            icon: <Megaphone size={22} />
        },
        {
            name: "Post Review",
            path: "/admin/reviews",
            icon: <FileSearch size={22} />
        },
        {
            name: "Feedback",
            path: "/admin/feedback",
            icon: <MessageSquareMore size={22} />
        },
        {
            name: "Announcement",
            path: "/admin/ann",
            icon: <Bell size={22} />
        },
        {
            name: "Log Out",
            path: "/logout",
            icon: (<span className="material-symbols-outlined">logout</span>)
        }
    ];

    return (
        <div
            className={`adminSidebar ${
                isOpen ? "expanded" : "collapsed"
            }`}
        >

            <button
                className="toggleBtn"
                onClick={toggleSidebar}
            >
                <span className="material-symbols-outlined">
                    menu
                </span>
            </button>

            <ul className="menu">

                {menuItems.map((item, index) => (

                    <li
                        key={index}
                        className={`menuItem ${
                            location.pathname === item.path
                                ? "active"
                                : ""
                        }`}
                        onClick={() => navigate(item.path)}
                    >

                        <span className="icon">
                            {item.icon}
                        </span>

                        {isOpen && (
                            <span className="text">
                                {item.name}
                            </span>
                        )}

                    </li>

                ))}

            </ul>

        </div>
    );
}

export default AdminSidebar;