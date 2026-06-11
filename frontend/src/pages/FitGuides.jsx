import { useState, useEffect } from "react";
import "../styles/FitGuides.css";

function FitGuides() {
    // state to hold our data
    const [sports, setSports] = useState([]);          // list of sports from database
    const [sportId, setSportId] = useState("recommended");      // currently selected sport
    const [videos, setVideos] = useState([]);          // videos to show
    const [loading, setLoading] = useState(true);

    // when the page first loads, get the sports from database
    useEffect(() => {
        loadSports();
    }, []);

    // when the user picks a different sport, get videos for that sport
    useEffect(() => {
        if (sportId) {
            loadVideos(sportId);
        }
    }, [sportId]);

    // get sports list from backend
    async function loadSports() {
        const response = await fetch("/api/sport-category");
        const data = await response.json();
        const sportsList = (data.data || []).filter((s) => s.is_deleted === 0);
        setSports(sportsList);
    }

    // get videos for a specific sport from backend
    async function loadVideos(id) {
        setLoading(true);
        const response = await fetch("/api/fit-guides?sport_id=" + id);
        const data = await response.json();
        setVideos(data.data || []);
        setLoading(false);
    }

    // when user picks a different sport in the dropdown
    function handleSportChange(event) {
        const value = event.target.value;
        setSportId(value === "recommended" ? "recommended" : parseInt(value));
    }

    return (
        <>
            <div className="fitGuidesContainer">
                <h1>Fitness Guides</h1>

                {/* Recommended (by user's sport) or pick a specific sport */}
                <div className="filterBar">
                    <label>Choose a sport: </label>
                    <select value={sportId || ""} onChange={handleSportChange}>
                        <option value="recommended">Recommended</option>
                        {sports.map((s) => (
                            <option key={s.category_id} value={s.category_id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Show loading message */}
                {loading && <p>Loading videos...</p>}

                {/* Show "no videos" if empty */}
                {!loading && videos.length === 0 && <p>No videos found.</p>}

                {/* Show the videos */}
                {!loading && videos.length > 0 && (
                    <div className="videoGrid">
                        {videos.map((video) => (
                            <div key={video.youtube_id} className="videoCard">
                                <iframe
                                    src={"https://www.youtube.com/embed/" + video.youtube_id}
                                    title={video.title}
                                    allowFullScreen
                                ></iframe>
                                <h3>{video.title}</h3>
                                <p>{video.description}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default FitGuides;
