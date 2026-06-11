import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Activities.css";
import socket from "../api/socket";

export default function AllActivities({ currentUser }) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state for managing requests if user views their own hosted activity
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [requests, setRequests] = useState([]);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [joinedPlayers, setJoinedPlayers] = useState([]);

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
      const response = await fetch("/api/activities?tab=all");
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

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Activity deleted successfully.");
        loadActivities();
      } else {
        toast.error(data.error || "Failed to delete activity");
      }
    } catch (error) {
      console.error("Error deleting activity", error);
      toast.error("Network error. Failed to delete activity.");
    }
  };

  const handleJoinActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/join`, {
        method: "POST"
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Join request submitted!");
        loadActivities();
      } else {
        toast.error(data.error || "Failed to request join");
      }
    } catch (error) {
      console.error("Error joining activity", error);
      toast.error("Network error. Failed to request join.");
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

  const handleOpenRequestsModal = async (activity) => {
    setSelectedActivity(activity);
    setShowRequestsModal(true);
    fetchRequests(activity.activity_id);
  };

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

  const fetchRequests = async (activityId) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/requests`);
      const data = await response.json();
      if (response.ok) {
        setRequests(data.requests || []);
      } else {
        toast.error(data.error || "Failed to fetch join requests");
      }
    } catch (error) {
      console.error("Error fetching requests", error);
      toast.error("Network error. Failed to load join requests.");
    }
  };

  const handleRespondToRequest = async (playerId, status) => {
    try {
      const response = await fetch(`/api/activities/requests/${playerId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(`Request successfully ${status.toLowerCase()}ed!`);
        if (selectedActivity) {
          fetchRequests(selectedActivity.activity_id);
        }
        loadActivities();
      } else {
        toast.error(data.error || "Failed to update request status");
      }
    } catch (error) {
      console.error("Error responding to request", error);
      toast.error("Network error. Failed to update request status.");
    }
  };

  return (
    <div className="activitiesContainer">
      {/* Header */}
      <div className="activitiesHeader">
        <div className="activitiesHeaderLeft">
          <h1>Activity Hosting & Recruitment</h1>
          <p>Find teammates, schedule sessions, and host matches in your local community.</p>
        </div>
        <button className="hostBtn" onClick={() => navigate("/user/activities/create")}>
          <span className="material-symbols-outlined">add</span>
          Host Activity
        </button>
      </div>

      {/* Tabs */}
      <div className="activitiesTabBar">
        <button
          className="activitiesTabBtn active"
          onClick={() => navigate("/user/activities/all")}
        >
          All Activities
        </button>
        <button
          className="activitiesTabBtn"
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
          <p>No activities found. Try hosting one to get started!</p>
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

                {/* Status Badges */}
                {activity.my_status === "Owner" && (
                  <span className="activityStatusBadge owner">Host</span>
                )}
                {activity.my_status && activity.my_status !== "Owner" && (
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

                {/* Render appropriate actions */}
                {activity.my_status === "Owner" ? (
                  <div className="actionBtnGroup">
                    <button
                      className={`actionBtn manage ${activity.pending_count > 0 ? "pending-blue" : ""}`}
                      onClick={() => handleOpenRequestsModal(activity)}
                    >
                      Requests {activity.pending_count > 0 ? `(${activity.pending_count})` : ""}
                    </button>
                    <button
                      className="actionBtn manage"
                      onClick={() => navigate(`/user/activities/edit/${activity.activity_id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="actionBtn delete"
                      onClick={() => handleDeleteActivity(activity.activity_id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <>
                    {!activity.my_status && (
                      <button
                        className="actionBtn join"
                        onClick={() => handleJoinActivity(activity.activity_id)}
                      >
                        Join
                      </button>
                    )}
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manage Requests Modal */}
      {showRequestsModal && (
        <div className="activityModalOverlay" onClick={() => setShowRequestsModal(false)}>
          <div className="activityModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="activityModalHeader">
              <h2>Join Requests</h2>
              <button className="closeModalBtn" onClick={() => setShowRequestsModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Manage player requests for: <strong>{selectedActivity?.title}</strong>
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
              {requests.length === 0 ? (
                <div className="noRequestsText">No players have requested to join yet.</div>
              ) : (
                requests.map((req) => (
                  <div key={req.player_id} className="requestItem">
                    <div className="requestUserInfo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {req.profile_pic ? (
                        <img src={req.profile_pic} alt="user" className="requestUserPic" />
                      ) : (
                        <div className="requestUserFallback">
                          {req.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span className="requestUsername" style={{ fontWeight: "600", fontSize: "14px", color: "#334155" }}>@{req.username}</span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {req.age ? `Age: ${req.age} ` : "Age N/A"} • {req.requestor_skill_level ? `${req.requestor_skill_level} at ${selectedActivity?.sport_name}` : `No profile for ${selectedActivity?.sport_name}`}
                        </span>
                      </div>
                    </div>

                    <div className="requestActions">
                      {req.status === "Pending" ? (
                        <>
                          <button
                            className="acceptBtn"
                            onClick={() => handleRespondToRequest(req.player_id, "Accepted")}
                          >
                            Accept
                          </button>
                          <button
                            className="rejectBtn"
                            onClick={() => handleRespondToRequest(req.player_id, "Rejected")}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className={`activityStatusBadge ${req.status.toLowerCase()}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="formActions">
              <button
                type="button"
                className="hostBtn"
                onClick={() => setShowRequestsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
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
