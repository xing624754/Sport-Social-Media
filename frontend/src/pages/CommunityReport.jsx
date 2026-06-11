import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { getReportContent } from "../api/sportsCommunity";

import "../styles/CommunityReport.css";

export default function CommunityReport({ communityID, setViewReport }){
    const [months, setMonths] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(2);
    const [reportContent, setReportContent] = useState([]);
    const [activeMembers, setActiveMembers] = useState([]);

    useEffect(() => {
        loadMonths();

        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = prev;
        };

    }, []);

    const loadMonths = () => {
        const temp = [];
        for (let i = 0; i < 3; i++){
            const date = new Date();

            date.setMonth(date.getMonth() - i);

            const formatted = date.toISOString().slice(0, 7);

            temp.push(formatted);
        }
        
        setMonths(temp.reverse());
    };

    useEffect(() => {
        if (!months.length) return;

        loadReportContent();
    
    }, [currentIndex, months]);

    const loadReportContent = async () => {
        try {
            const response = await getReportContent(communityID, months[currentIndex]);
            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error);
                return;
            }

            const content = data.report_content;

            const total = Number(content.new_post_count);
            console.log("TOTAL POSTS:", content.post_count);
            console.log("ACTIVE MEMBERS:", content.active_members);

            const updatedMembers = (content.active_members || []).map(member => {
                const count = Number(member.post_count);

                const percentage =
                    !total || isNaN(total) || isNaN(count)
                        ? 0
                        : (count / total) * 100;

                return {
                    ...member,
                    post_percentage: Math.min(100, Math.max(0, percentage))
                };
            });

            setReportContent(content);
            setActiveMembers(updatedMembers);

        } catch (err) {
            toast.error("Network error");
        }
    };
    return (
        <div className="report-page">
            <div className="report-container">
                <div className="report-header">
                    <div className="report-header-left">
                        <button
                            className="community-back-button"
                            type="button"
                            onClick={() => setViewReport(false)}
                        >
                            {"<"}
                        </button>

                        <h2>Monthly Community Report</h2>
                    </div>

                    <div className="report-header-right">
                        <button
                            className="month-button"
                            type="button"
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                        >
                            {"<"}
                        </button>

                        <div className="month-box">
                            <label className="mmonth-label">
                                {new Date(months[currentIndex] + "-01").toLocaleString("en-US", {
                                    month: "short"
                                })}
                            </label>
                        </div>

                        <button
                            className="month-button"
                            type="button"
                            disabled={currentIndex === months.length - 1}
                            onClick={() => setCurrentIndex(prev => prev + 1)}
                        >
                            {">"}
                        </button>
                    </div>
                </div>

                <div className="report-wrapper">
                    <div className="top-analytics">
                        <div className="analytics-wrapper">

                            <h3>{reportContent.total_member_count}</h3>
                            
                            <label className="analytics-label">
                                Total Members
                            </label>

                        </div>

                        <div className="analytics-wrapper">

                            <h3>{reportContent.new_member_count}</h3>
                            
                            <label className="analytics-label">
                                New Members
                            </label>
                            
                        </div>

                        <div className="analytics-wrapper">

                            <h3>{reportContent.new_post_count}</h3>
                            
                            <label className="analytics-label">
                                New Posts
                            </label>
                            
                        </div>
                    </div>

                    <div className="bottom-analytics">
                        <h3>Active Members</h3>

                        <div className="active-members-container">
                            {activeMembers.length > 0 && activeMembers.map((activeMember, index) => (
                                <div 
                                    className="active-member-wrapper"
                                    key={activeMember.user_id}
                                >
                                    <div className="active-member-top">
                                        <div className="member-index">
                                            {index + 1}
                                        </div>

                                        <label className="active-member-username">
                                            {activeMember.username}
                                        </label>
                                    </div>

                                    <div className="active-member-bottom">
                                        <div className="bar-bg">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${activeMember.post_percentage}%` }}
                                            />
                                        </div>

                                        <div className="member-post-count">
                                            {activeMember.post_count} posts
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeMembers.length === 0 && (
                                <label className="info-label">No active members</label>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};