import { useState } from "react";
import "../styles/ManageCategory.css";
import AgeGroupTab from "./AgeGroupTab.jsx";
import SkillLevelTab from "./SkillLevelTab.jsx";
import SportCategoryTab from "./SportCategoryTab.jsx";
import AdminLayout from "./AdminLayout.jsx";


export default function ManageCategory() {
    const [activeTab, setActiveTab] = useState("Age Groups");

    return (
            <div className="manageCategoryPage">

                {/* Main Content Area */}
                <main className="mainContent">
                    {/* Dashboard Header */}
                    <div className="dashboardHeader">
                        <div>
                            <h2 className="headerTitle">Category Management</h2>
                            <p className="headerDesc">
                                Manage available categories for user selection.
                            </p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tabsNav">
                        <button
                            className={`tab ${activeTab === 'Sport Categories' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Sport Categories')}
                        >
                            <span className="material-symbols-outlined">sports_basketball</span>
                            Sport Categories
                        </button>
                        <button
                            className={`tab ${activeTab === 'Skill Levels' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Skill Levels')}
                        >
                            <span className="material-symbols-outlined">trending_up</span>
                            Skill Levels
                        </button>
                        <button
                            className={`tab ${activeTab === 'Age Groups' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Age Groups')}
                        >
                            <span className="material-symbols-outlined">groups</span>
                            Age Groups
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'Age Groups' && <AgeGroupTab />}
                    {activeTab === 'Skill Levels' && <SkillLevelTab />}
                    {activeTab === 'Sport Categories' && <SportCategoryTab />}

                    {/* Footer */}
                    <footer className="footer">
                        <span>© 2026 Sportify</span>
                    </footer>
                </main>
            </div>
    );
}