import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";


function UserSidebar({ isOpen, toggleSidebar }) {

    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        {
            name:"Create Post", 
            path:"/user/create-post",
            icon:<span className="material-symbols-outlined">add_circle</span>
            
        },
        {
            name:"Community", 
            path:"/user/sports-community",
            icon:( <span className="material-symbols-outlined">public</span>)
            
        },
        {
            name:"Find Players",
            path:"/user/find-player",
            icon:(<span className="material-symbols-outlined">diversity_3</span>)
        },  
        {
            name: "Activities",
            path:"/user/activities/all",
            icon: (<span className="material-symbols-outlined">sports_soccer</span>)
        },
        {
            name:"Fitness Guides",
            path:"/user/fitness-guides",
            icon:(<span className="material-symbols-outlined">fitness_center</span>)
        },
        {
            name: "Equipment",
            path:"/user/equipments",
            icon: (<span className="material-symbols-outlined">badminton</span>)
        },
        {
            name: "Feedback",
            path:"/user/feedback",
            icon: (<span className="material-symbols-outlined">feedback</span>)
        },
        {
            name: "Sporty",
            path:"/user/sporty",
            icon: (<span className="material-symbols-outlined">robot_2</span>)
        },
        {
            name: "Log Out",
            path:"/logout",
            icon: (<span className="material-symbols-outlined">logout</span>)
        }
    ];

    return(
        <div className={`userSidebar ${isOpen ? "expanded" : "collapsed"}`}>

            <button 
                className="toggleBtn"
                onClick={toggleSidebar}
            >
                <span className="material-symbols-outlined">
                    menu
                </span>
            </button>

            <ul className="menu">
                {menuItems.map((item, index) =>(

                    <li 
                        key={index} 
                        className={`menuItem ${
                            location.pathname === item.path ? "active" : ""
                        }`}
                        onClick={() => navigate(item.path)}
                    >

                        <span className="icon">{item.icon}</span>
                        {isOpen && <span className="text">{item.name}</span>}
                    </li>
                ))}
            </ul>


        </div>
    )
};


export default UserSidebar;