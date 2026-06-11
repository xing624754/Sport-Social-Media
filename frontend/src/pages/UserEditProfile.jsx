import { useEffect, useState } from "react";
import {
    User, Mail, Calendar, VenusAndMars,
    Dumbbell, Trophy, Lock,
    ImagePlus, ArrowLeft, Save,
    Eye, EyeOff
} from "lucide-react";

import axios from "axios";
import "../styles/UserEditProfile.css";
import { useNavigate } from "react-router-dom";


function UserEditProfile({ currentUser, setUser }) {

    const navigate = useNavigate();
    const defaultProfilePic = "/uploads/profile_pics/user.png";

    const [username, setUsername] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);

    const [gender, setGender] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [email, setEmail] = useState("");

    const [profilePic, setProfilePic] = useState(null);
    const [preview, setPreview] = useState("");

    const [sports, setSports] = useState([]);
    const [skillLevels, setSkillLevels] = useState([]);

    const [preferences, setPreferences] = useState([
        { sport: "", skillLevel: "" }
    ]);

    useEffect(() => {

        fetchSports();
        fetchSkillLevels();

        if (currentUser?.userID) {
            fetchProfile();
        }

    }, [currentUser?.userID]);

    useEffect(() => {
        return () => {
            if (preview && preview.startsWith("blob:")) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const fetchSports = async () => {
        try {
            const response = await axios.get(`/api/sport`);
            setSports(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    const fetchSkillLevels = async () => {
        try {
            const response = await axios.get(`/api/skill-level`);
            console.log("Skill Levels:", response.data);
            setSkillLevels(response.data.data || []);
        } catch (error) {
            console.log(error);
            setSkillLevels([]);
        }
    };

    const addPreference = () => {
        const last = preferences[preferences.length - 1];

        if (last && (!last.sport || !last.skillLevel)) {
            alert("Please fill out the existing preference before adding a new one.");
            return;
        }

        setPreferences([...preferences, { sport: "", skillLevel: "" }]);
    };

    const removePreference = (index) => {
        if (preferences.length === 1) {
            alert("At least one preference is required.");
            return;
        }

        const updated = [...preferences];
        updated.splice(index, 1);
        setPreferences(updated);
    };

    const updatePreference = (index, field, value) => {
        const updated = [...preferences];

        //prevent duplicate sport selection 
        if (field === "sport") {
            const sportAlreadySelected = updated.some((p, i) =>
                i !== index && p.sport === value && value !== ""
            );

            if (sportAlreadySelected) {
                alert("This sport has already been selected.");
                return;
            }
        }

        updated[index][field] = value;
        setPreferences(updated);
    };

    const fetchProfile = async () => {

        if (!currentUser?.userID) return;

        try {
            console.log("Fetching profile for:", currentUser?.userID);
            const res = await axios.get(
                `/api/profile/${currentUser?.userID}`,
                {
                    withCredentials:true
                }
            );
            console.log("PROFILE RESPONSE:", res.data);
            
            const data = res.data.user;

            setUsername(data.username || "");
            setEmail(data.email || "");
            setGender(data.gender || "");
            setBirthdate(
                data.birthdate
                    ? new Date(data.birthdate).toISOString().split("T")[0]
                    : ""
            );

            setPreview(data.profile_pic || defaultProfilePic);

            if (data.tags?.length > 0) {
                setPreferences(
                    data.tags.map(t => ({
                        sport: String(t.sport_id),
                        skillLevel: String(t.skill_level_id)
                    }))
                );
            }

        } catch (err) {
            console.log(err);
        }
    };

    const handleVerifyCurrentPassword = async () => {
        if (!currentPassword) {
            alert("Please enter your current password.");
            return;
        }
        try {
            const res = await axios.post("/api/verify-current-password", {
                current_password: currentPassword
            }, { withCredentials: true });
            
            if (res.data.message === "Verified") {
                setIsCurrentPasswordVerified(true);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Verification failed");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // clean preferences
        const cleanedPreferences = preferences.filter(
            p => p.sport && p.skillLevel
        );

        // password validation
        if (newPassword || confirmPassword) {
            if (!isCurrentPasswordVerified) {
                alert("Please verify your current password first.");
                return;
            }

            if (newPassword !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }
        }

        try {
            const formData = new FormData();

            formData.append("username", username);
            formData.append("email", email);
            formData.append("gender", gender);
            formData.append("birthdate", birthdate);
            formData.append("preferences", JSON.stringify(cleanedPreferences));
            formData.append("current_password", currentPassword);
            formData.append("new_password", newPassword);
            formData.append("confirm_password", confirmPassword);

            if (profilePic) {
                formData.append("profile_pic", profilePic);
            }

            const response = await axios.put(
                `/api/edit-profile/${currentUser?.userID}`,
                formData,
                {
                    withCredentials: true,
                    // Let axios/browser set the Content-Type (boundary) for multipart
                }
            );

            alert(response.data.message);

            const updatedProfile = await axios.get(
                `/api/profile/${currentUser?.userID}`,
                {
                    withCredentials:true
                }
            );
            const userData = updatedProfile.data.user;

            setUser(prev => ({
                ...prev,
                userID: userData.user_id,
                username: userData.username,
                email: userData.email, 
                profile_pic: userData.profile_pic,
                gender: userData.gender,
                birthdate: userData.birthdate
            }));

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setIsCurrentPasswordVerified(false);

            navigate("/user/profile");

        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message || "Update failed");
        }
    };

    return (
        
        <div className="editProfileContainer">

            <h1>Edit Profile</h1>
            <p className="editProfileSubtitle">
                Update your profile information and sport preferences
            </p>

            <form className="editProfileForm" onSubmit={handleSubmit}>

                {/* LEFT */}
                <div className="profileLeft">

                    <div className="profilePreviewWrapper">
                        <img
                            src={preview || defaultProfilePic}
                            alt="Preview"
                            className="profilePreview"
                        />
                    </div>

                    <label className="uploadLabel">
                        <ImagePlus size={16} style={{ marginRight: "6px" }} />
                        Change Profile Picture

                        <input
                            type="file"
                            accept="image/*"
                            className="uploadInput"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                setProfilePic(file);

                                if (file) {
                                    setPreview(URL.createObjectURL(file));
                                }
                            }}
                        />
                    </label>
                </div>

                {/* RIGHT */}
                <div className="profileRight">

                    {/* ACCOUNT */}
                    <div className="formSection">
                        <h2 className="formSectionTitle">Account Information</h2>

                        <div className="inputGrid">

                            <div className="inputGroupInFullWidth">
                                <label className="labelWithIcon">
                                    <User size={16} /> Username
                                </label>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            <div className="inputGroup">
                                <label className="labelWithIcon">
                                    <Mail size={16} /> Email
                                </label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="inputGroup">
                                <label className="labelWithIcon">
                                    <VenusAndMars size={16} /> Gender
                                </label>
                                <select value={gender} disabled>
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div className="inputGroup">
                                <label className="labelWithIcon">
                                    <Calendar size={16} /> Birthdate
                                </label>
                                <input type="date" value={birthdate} disabled />
                            </div>
                        </div>
                    </div>

                    {/* PREFERENCES */}
                    <div className="formSection">
                        <h2 className="formSectionTitle">Sports Preference</h2>

                        {preferences.map((pref, index) => (
                            <div key={index} className="inputGrid">

                                <div className="inputGroup">
                                    <label><Dumbbell size={16} /> Sport</label>
                                    <select
                                        value={pref.sport}
                                        onChange={(e) =>
                                            updatePreference(index, "sport", e.target.value)
                                        }
                                    >
                                        <option value="">Select Sport</option>
                                        {sports.map((s) => (
                                            <option key={s.sport_id} value={String(s.sport_id)}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="inputGroup">
                                    <label><Trophy size={16} /> Skill Level</label>
                                    <select
                                        value={pref.skillLevel}
                                        onChange={(e) =>
                                            updatePreference(index, "skillLevel", e.target.value)
                                        }
                                    >
                                        <option value="">Select Skill</option>
                                        {(Array.isArray(skillLevels) ? skillLevels : []).map((sl) => (
                                            <option key={sl.skill_level_id} value={String(sl.skill_level_id)}>
                                                {sl.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="deleteBtnWrapper">
                                    <div className="deleteBtns">
                                        <button 
                                            type="button" 
                                            onClick={() => removePreference(index)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>

                            </div>
                        ))}

                        <button 
                            type="button" 
                            className="addPreferenceBtn"
                            onClick={addPreference}>
                            + Add Preference
                        </button>
                    </div>

                    {/* PASSWORD */}
                    <div className="formSection">

                        <h2 className="formSectionTitle">
                            <Lock size={18} />
                            Change Password
                        </h2>

                        <div className="inputGrid">
                            {!isCurrentPasswordVerified ? (
                                <div className="passwordGroup" style={{ display: "flex", gap: "10px", width: "100%", flexDirection: "column" }}>
                                    <div className="passwordWrapper">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            placeholder="Current Password"
                                            value={currentPassword}
                                            onChange={(e) =>
                                                setCurrentPassword(e.target.value)
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="togglePasswordBtn"
                                            onClick={() =>
                                                setShowCurrentPassword(!showCurrentPassword)
                                            }
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff size={18} />
                                            ) : (
                                                <Eye size={18} />
                                            )}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="verifyContinueBtn"
                                        onClick={handleVerifyCurrentPassword}
                                        style={{
                                            padding: "10px 15px",
                                            backgroundColor: "#0f172a",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            width: "fit-content",
                                            fontWeight: "500"
                                        }}
                                    >
                                        Continue
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ color: "#16a34a", fontSize: "14px", fontWeight: "bold", gridColumn: "1 / -1" }}>
                                        ✓ Current password verified. You can now set a new password.
                                    </div>

                                    {/* NEW PASSWORD */}
                                    <div className="passwordGroup">

                                        <div className="passwordWrapper">

                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="New Password"
                                                value={newPassword}
                                                onChange={(e) =>
                                                    setNewPassword(e.target.value)
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="togglePasswordBtn"
                                                onClick={() =>
                                                    setShowNewPassword(!showNewPassword)
                                                }
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff size={18} />
                                                ) : (
                                                    <Eye size={18} />
                                                )}
                                            </button>

                                        </div>
                                    </div>

                                    {/* CONFIRM PASSWORD */}
                                    <div className="passwordGroup">

                                        <div className="passwordWrapper">

                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm Password"
                                                value={confirmPassword}
                                                onChange={(e) =>
                                                    setConfirmPassword(e.target.value)
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="togglePasswordBtn"
                                                onClick={() =>
                                                    setShowConfirmPassword(!showConfirmPassword)
                                                }
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff size={18} />
                                                ) : (
                                                    <Eye size={18} />
                                                )}
                                            </button>

                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="editProfileBtnWrapper">
                        <button 
                            type="button" 
                            className="cancelBtn"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft size={16} /> 
                            Cancel
                        </button>

                        <button 
                            type="submit"
                            className="saveBtn"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </form>
        </div>
        
    );
}

export default UserEditProfile;