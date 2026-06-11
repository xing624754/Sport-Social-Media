import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/Activities.css";

export default function CreateActivity({ currentUser }) {
  const navigate = useNavigate();

  // Protect route: redirect to login if not a User
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'User') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Metadata dropdown state
  const [sports, setSports] = useState([]);
  const [skillLevels, setSkillLevels] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);

  // Form fields state
  const [title, setTitle] = useState("");
  const [selectedSport, setSelectedSport] = useState("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [totalPlayerNeeded, setTotalPlayerNeeded] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch metadata on mount
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [sportsRes, skillRes, ageRes] = await Promise.all([
        fetch("/api/sport-category"),
        fetch("/api/skill-level"),
        fetch("/api/age-group")
      ]);

      const sportsData = await sportsRes.json();
      const skillData = await skillRes.json();
      const ageData = await ageRes.json();

      if (sportsRes.ok) setSports(sportsData.data || []);
      if (skillRes.ok) setSkillLevels(skillData.data || []);
      if (ageRes.ok) setAgeGroups(ageData.data || []);
    } catch (error) {
      console.error("Failed to load form metadata", error);
      toast.error("Failed to load category selections.");
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title,
      sport: parseInt(selectedSport),
      skill_level: selectedSkillLevel ? parseInt(selectedSkillLevel) : null,
      age_group: selectedAgeGroup ? parseInt(selectedAgeGroup) : null,
      description,
      date,
      start_time: startTime,
      end_time: endTime,
      venue,
      total_player_needed: totalPlayerNeeded ? parseInt(totalPlayerNeeded) : null
    };

    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Activity hosted successfully!");
        navigate("/user/activities/my");
      } else {
        toast.error(data.error || "Failed to host activity");
      }
    } catch (error) {
      console.error("Error creating activity", error);
      toast.error("Network error. Failed to host activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="activitiesContainer">
      <div className="activitiesHeader">
        <div className="activitiesHeaderLeft">
          <h1>Host New Activity</h1>
          <p>Fill out the details below to recruit players for your session.</p>
        </div>
        <button className="actionBtn manage" onClick={() => navigate("/user/activities/all")}>
          Back to Dashboard
        </button>
      </div>

      <div style={{ maxWidth: "650px", margin: "20px auto", background: "#fff", padding: "30px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <form onSubmit={handleCreateActivity}>
          <div className="formGroup" style={{ marginBottom: "20px" }}>
            <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Activity Title</label>
            <input
              type="text"
              className="inputField"
              placeholder="e.g. Friendly Futsal Match, Sunday Morning Basketball"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
            />
          </div>

          <div className="formRow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Sport</label>
              <select
                className="selectField"
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "14px" }}
              >
                <option value="">Select Sport</option>
                {sports.map((s) => (
                  <option key={s.category_id} value={s.category_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Skill Level</label>
              <select
                className="selectField"
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "14px" }}
              >
                <option value="">Select Skill</option>
                {skillLevels.map((l) => (
                  <option key={l.skill_level_id} value={l.skill_level_id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="formRow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Age Group Target</label>
              <select
                className="selectField"
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "14px" }}
              >
                <option value="">Select Age Group</option>
                {ageGroups.map((g) => (
                  <option key={g.group_id} value={g.group_id}>
                    {g.age_from} - {g.to_age} Years
                  </option>
                ))}
              </select>
            </div>

            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Date</label>
              <input
                type="date"
                className="inputField"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
              />
            </div>
          </div>

          <div className="formRow" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Start Time</label>
              <input
                type="time"
                className="inputField"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
              />
            </div>

            <div className="formGroup">
              <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>End Time</label>
              <input
                type="time"
                className="inputField"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
              />
            </div>
          </div>

          <div className="formGroup" style={{ marginBottom: "20px" }}>
            <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Venue / Location</label>
            <input
              type="text"
              className="inputField"
              placeholder="e.g. Sports Hub Arena 3, Community Hall"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={50}
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
            />
          </div>

          <div className="formGroup" style={{ marginBottom: "20px" }}>
            <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Total Players Needed (Optional)</label>
            <input
              type="number"
              className="inputField"
              placeholder="e.g. 10 (Leave blank if no limit)"
              value={totalPlayerNeeded}
              onChange={(e) => setTotalPlayerNeeded(e.target.value)}
              min={1}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
            />
          </div>

          <div className="formGroup" style={{ marginBottom: "20px" }}>
            <label className="formLabel" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px", color: "#334155" }}>Description / Notes</label>
            <textarea
              className="textareaField"
              placeholder="Describe the match details, equipment needed, number of spots, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", minHeight: "100px", fontSize: "14px", resize: "vertical" }}
            />
          </div>

          <div className="formActions" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
            <button
              type="button"
              className="actionBtn manage"
              onClick={() => navigate("/user/activities/all")}
              style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer", border: "1px solid #cbd5e1" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hostBtn"
              disabled={isSubmitting}
              style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
            >
              {isSubmitting ? "Hosting..." : "Create Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
