import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../api/socket";

import "../styles/PostReport.css";

function PostReport() {
    const { user_id } = useParams();
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [currentIndexes, setCurrentIndexes] = useState({});

    useEffect(() => {
        fetchReports();

        socket.on("reports_updated", fetchReports);
        return () => {
            socket.off("reports_updated", fetchReports);
        };

    }, []);

    async function fetchReports() {
        try {
            const response = await axios.get(
                `/api/post-report-details/${user_id}`,
                { withCredentials: true }
            );
            setReports(response.data.reports);
        } catch (error) {
            console.log(error);
        }
    }

    // NEXT MEDIA
    function nextMedia(reportID, total) {
        setCurrentIndexes((prev) => ({
            ...prev,
            [reportID]: ((prev[reportID] || 0) + 1) % total
        }));
    }

    // PREVIOUS MEDIA
    function prevMedia(reportID, total) {
        setCurrentIndexes((prev) => ({
            ...prev,
            [reportID]: ((prev[reportID] || 0) - 1 + total) % total
        }));
    }

    return (
        <div className="post-report-page">
            {/* HEADER */}
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div>
                    <h1>Reported Posts</h1>
                    <p>Review reported post content</p>
                </div>
            </div>

            {/* REPORT GRID */}
            {reports.length === 0 ? (
                <div className="no-reports-message" style={{ textAlign: "center", marginTop: "50px", color: "#666" }}>
                    <h3>No approved reports found for this user.</h3>
                </div>
            ) : (
                <div className="report-grid">
                    {reports.map((report) => {
                        const mediaList = report.media_urls ? report.media_urls.split("||") : [];
                        const lookupKey = report.post_id || report.report_id;
                        const currentIndex = currentIndexes[lookupKey] || 0;
                        const currentMedia = mediaList[currentIndex];
                        const isVideo = currentMedia?.match(/\.(mp4|webm|ogg)$/i);

                        // Parse out our structured string into objects: [{ name, reason }]
                        const individualReports = report.report_meta 
                            ? report.report_meta.split("&&&").map(item => {
                                const [name, reason] = item.split("|||");
                                return { name: name || 'Unknown', reason: reason || 'No reason provided' };
                              })
                            : [];

                        return (
                            <div key={lookupKey} className="report-card">
                                {/* MEDIA SLIDER */}
                                <div className="media-slider">
                                    {mediaList.length > 0 && (
                                        <>
                                            {isVideo ? (
                                                <video src={currentMedia} controls className="slider-media" />
                                            ) : (
                                                <img src={currentMedia} alt="post media" className="slider-media" />
                                            )}

                                            {mediaList.length > 1 && (
                                                <>
                                                    <button className="slider-btn left" onClick={() => prevMedia(lookupKey, mediaList.length)}>‹</button>
                                                    {/* FIXED: Swapped navigate back to nextMedia slider logic */}
                                                    <button className="slider-btn right" onClick={() => nextMedia(lookupKey, mediaList.length)}>›</button>
                                                </>
                                            )}

                                            <div className="media-dots">
                                                {mediaList.map((_, index) => (
                                                    <span key={index} className={index === currentIndex ? "dot active" : "dot"} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* CONTENT */}
                                <div className="report-content">
                                    <div className="report-top">
                                        <h2>{report.title}</h2>
                                        <span className="report-type">{report.post_type}</span>
                                    </div>

                                    <p className="post-description">{report.post_description}</p>

                                    <div className="report-info">
                                        {/* LAYOUT CHOICE LOGIC */}
                                        {individualReports.length === 1 ? (
                                            /* 1. SINGLE REPORTER LAYOUT */
                                            <>
                                                <p style={{ margin: "4px 0" }}>
                                                    <strong>Reporter:</strong> {individualReports[0].name}
                                                </p>
                                                <p style={{ margin: "4px 0" }}>
                                                    <strong>Report Reason:</strong> {individualReports[0].reason}
                                                </p>
                                            </>
                                        ) : (
                                            /* 2. MULTIPLE REPORTERS LIST LAYOUT */
                                            individualReports.map((item, index) => (
                                                <div key={index} className="reporter-meta-block" style={{ marginBottom: "12px" }}>
                                                    <p style={{ margin: "2px 0" }}>
                                                        <strong>Reporter {index + 1}:</strong> {item.name}
                                                    </p>
                                                    <p style={{ margin: "2px 0", color: "#555" }}>
                                                        <strong>Report Reason:</strong> {item.reason}
                                                    </p>
                                                </div>
                                            ))
                                        )}

                                        {/* Divider line before target metrics */}
                                        <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "12px 0" }} />

                                        <p style={{ margin: "4px 0" }}>
                                            <strong>Posted By:</strong> {report.username}
                                        </p>
                                        <p style={{ margin: "4px 0" }}>
                                            <strong>Post Time:</strong> {new Date(report.post_time).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default PostReport;