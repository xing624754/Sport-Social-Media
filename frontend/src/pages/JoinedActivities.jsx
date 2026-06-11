import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Activities.css";
import socket from "../api/socket";

export default function JoinedActivities({ currentUser }) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [joinedPlayers, setJoinedPlayers] = useState([]);

  const handleOpenPlayersModal = async (activity) => {
    setSelectedActivity(activity);
    setShowPlayersModal(true);
    fetchJoinedPlayers(activity.activity_id);
  };

  const fetchJoinedPlayers = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/players`);
      const data = await response.json();
      if (response.ok) {
        setJoinedPlayers(data.players || []);
      } else {
        toast.error(data.error || "Failed to fetch joined players");
      }
    } catch (error) {
      console.error("Error fetching joined players", error);
      toast.error("Network error. Failed to load joined players.");
    }
  };

  useEffect(() => {
    loadActivities();

    socket.on("activities_updated", loadActivities);
    return () => {
      socket.off("activities_updated", loadActivities);
    };
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/activities?tab=joined");
      const data = await response.json();
      if (response.ok) {
        setActivities(data.activities || []);
      } else {
        toast.error(data.error || "Failed to fetch activities");
      }
    } catch (error) {
      console.error("Failed to fetch activities", error);
      toast.error("Network error. Could not fetch activities.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to cancel your request or leave this activity?")) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}/leave`, {
        method: "POST"
      });
      const data = await response.json();

      if (response.ok) {
        toast.info(data.message || "You have left the activity.");
        loadActivities();
      } else {
        toast.error(data.error || "Failed to leave activity");
      }
    } catch (error) {
      console.error("Error leaving activity", error);
      toast.error("Network error. Failed to leave activity.");
    }
  };

  return (
    <div className="activitiesContainer">
      {/* Header */}
      <div className="activitiesHeader">
        <div className="activitiesHeaderLeft">
          <h1>Joined Activities</h1>
          <p>Keep track of activities you have joined or requested to join.</p>
        </div>
        <button className="hostBtn" onClick={() => navigate("/user/activities/create")}>
          <span className="material-symbols-outlined">add</span>
          Host Activity
        </button>
      </div>

      {/* Tabs */}
      <div className="activitiesTabBar">
        <button
          className="activitiesTabBtn"
          onClick={() => navigate("/user/activities/all")}
        >
          All Activities
        </button>
        <button
          className="activitiesTabBtn active"
          onClick={() => navigate("/user/activities/joined")}
        >
          Joined Activities
        </button>
        <button
          className="activitiesTabBtn"
          onClick={() => navigate("/user/activities/my")}
        >
          My Hosted
        </button>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="emptyActivities">
          <span className="material-symbols-outlined">event_busy</span>
          <p>You haven't requested to join or joined any activities yet. Find one under All Activities!</p>
        </div>
      ) : (
        <div className="activityGrid">
          {activities.map((activity) => (
            <div key={activity.activity_id} className="activityCard">
              <div className="activityCardHeader">
                <div className="creatorInfo">
                  {activity.creator_profile_pic ? (
                    <img src={activity.creator_profile_pic} alt="creator" className="creatorAvatar" />
                  ) : (
                    <div className="creatorAvatarFallback">
                      {activity.creator_username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="creatorName">@{activity.creator_username}</span>
                </div>

                {/* Status Badge */}
                {activity.my_status && (
                  <span className={`activityStatusBadge ${activity.my_status.toLowerCase()}`}>
                    {activity.my_status}
                  </span>
                )}
              </div>

              <div className="activityCardBody">
                <h3 className="activityTitle">{activity.title}</h3>
                
                <div className="activityTags">
                  <span className="activityTag sport">{activity.sport_name}</span>
                  {activity.skill_level_name && (
                    <span className="activityTag skill">{activity.skill_level_name}</span>
                  )}
                  {activity.age_from !== null && activity.to_age !== null && (
                    <span className="activityTag age">{activity.age_from} - {activity.to_age} Yrs</span>
                  )}
                </div>

                <p className="activityDesc">{activity.description}</p>

                <div className="activityDetailsList">
                  <div className="activityDetailItem">
                    <span className="material-symbols-outlined">calendar_today</span>
                    <span>{activity.date}</span>
                  </div>
                  <div className="activityDetailItem">
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{activity.start_time} - {activity.end_time}</span>
                  </div>
                  <div className="activityDetailItem">
                    <span className="material-symbols-outlined">location_on</span>
                    <span>{activity.venue}</span>
                  </div>
                </div>
              </div>

              <div className="activityCardFooter">
                <div className="participantCount" onClick={() => handleOpenPlayersModal(activity)}>
                  <span className="material-symbols-outlined">groups</span>
                  <span>Joined Players: {activity.joined_count}{activity.total_player_needed ? `/${activity.total_player_needed}` : ""}</span>
                </div>

                {/* Leave / Cancel Button */}
                {activity.my_status === "Pending" && (
                  <button
                    className="actionBtn leave"
                    onClick={() => handleLeaveActivity(activity.activity_id)}
                  >
                    Cancel
                  </button>
                )}
                {activity.my_status === "Accepted" && (
                  <button
                    className="actionBtn leave"
                    onClick={() => handleLeaveActivity(activity.activity_id)}
                  >
                    Leave
                  </button>
                )}
                {activity.my_status === "Rejected" && (
                  <button className="actionBtn leave" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    Rejected
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* View Joined Players Modal */}
      {showPlayersModal && (
        <div className="activityModalOverlay" onClick={() => setShowPlayersModal(false)}>
          <div className="activityModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="activityModalHeader">
              <h2>Joined Players</h2>
              <button className="closeModalBtn" onClick={() => setShowPlayersModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Players joined for: <strong>{selectedActivity?.title}</strong>
            </p>

            {selectedActivity && (
              <div className="activityTags" style={{ marginBottom: "16px", flexWrap: "wrap" }}>
                <span className="activityTag sport">{selectedActivity.sport_name}</span>
                {selectedActivity.skill_level_name && (
                  <span className="activityTag skill">{selectedActivity.skill_level_name}</span>
                )}
                {selectedActivity.age_from !== null && selectedActivity.to_age !== null && (
                  <span className="activityTag age">{selectedActivity.age_from} - {selectedActivity.to_age} Yrs</span>
                )}
              </div>
            )}

            <div className="requestList">
              {joinedPlayers.length === 0 ? (
                <div className="noRequestsText">No players have joined yet.</div>
              ) : (
                joinedPlayers.map((player) => (
                  <div key={player.player_id} className="requestItem">
                    <div className="requestUserInfo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {player.profile_pic ? (
                        <img src={player.profile_pic} alt="user" className="requestUserPic" />
                      ) : (
                        <div className="requestUserFallback">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="requestUsername" style={{ fontWeight: "600", fontSize: "14px", color: "#334155" }}>@{player.username}</span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {player.age ? `Age: ${player.age} ` : "Age N/A"} • {player.requestor_skill_level ? `${player.requestor_skill_level} at ${selectedActivity?.sport_name}` : `No profile for ${selectedActivity?.sport_name}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="formActions">
              <button
                type="button"
                className="hostBtn"
                onClick={() => setShowPlayersModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
