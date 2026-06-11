import { useEffect, useState } from "react";
import axios from "axios";




import {
  Pencil,
  Camera,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

import "../styles/AdminProfile.css";

function AdminProfile({currentUser}) {

  const userId = currentUser?.userID;
  console.log(currentUser);
  console.log(userId);

  const defaultProfilePic = "/uploads/profile_pics/user.png";

  const [selectedImage, setSelectedImage] = useState(null);

  const [previewImage, setPreviewImage] = useState("");

  const [editMode, setEditMode] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profile, setProfile] = useState({
    username: "",
    password: "",
    gender: "",
    birthdate: "",
    email: "",
    profile_pic: "",
    role: "",
    status: "",
    freeze_days: "",
  });

  const [originalProfile, setOriginalProfile] = useState({});

  useEffect(() => {

    if (userId) {
      fetchProfile();
    }

  }, [userId]);

  const fetchProfile = async () => {

    try {

      const response = await axios.get(
        `/api/admin/profile/${userId}`,
        {
          withCredentials: true
        }
      );

      setProfile(response.data);
      setOriginalProfile(response.data);

    } catch (error) {
      console.error(error);
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

  const handleChange = (e) => {

    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setCurrentPassword("");
    setConfirmPassword("");
    setIsCurrentPasswordVerified(false);
    setEditMode(false);
  };

  const handleSave = async () => {
    if (profile.password || confirmPassword) {
      if (!isCurrentPasswordVerified) {
        alert("Please verify your current password first.");
        return;
      }
      if (profile.password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
    }

    try {

      let updatedProfilePic = profile.profile_pic;

      // UPLOAD IMAGE ONLY WHEN SAVE CLICKED
      if (selectedImage) {

        const formData = new FormData();

        formData.append(
          "profile_picture",
          selectedImage
        );

        formData.append(
          "user_id",
          userId
        );

        const uploadResponse = await axios.post(
          "/api/admin/upload-profile-picture",
          formData,
          {
            withCredentials: true
          }
        );

        updatedProfilePic =
          uploadResponse.data.image_url;
      }

      // UPDATE PROFILE
      const updatedProfile = {
        ...profile,
        profile_pic: updatedProfilePic,
        confirmPassword: confirmPassword,
      };

      await axios.put(
        `/api/admin/profile/${userId}`,
        updatedProfile,
        {
          withCredentials: true,
        }
      );

      setProfile(updatedProfile);

      setOriginalProfile(updatedProfile);

      setPreviewImage("");

      setSelectedImage(null);

      setCurrentPassword("");
      setConfirmPassword("");
      setIsCurrentPasswordVerified(false);

      setEditMode(false);

      alert("Profile updated successfully");

    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Update failed");
    }
  };
  
  const handleImageUpload = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setSelectedImage(file);

    // preview image instantly
    const imageUrl = URL.createObjectURL(file);

    setPreviewImage(imageUrl);
  };

  const profileImage = previewImage || (profile?.profile_pic
      ? `${profile.profile_pic}?t=${Date.now()}`
      : defaultProfilePic);

  return (
      <div className="admin-profile-page">

      <div className="admin-profile-card">

          {/* PROFILE IMAGE */}
          <div className="profile-top-section">

          <div className="profile-image-wrapper">

              <img
                src={profileImage}
                alt="profile"
                className="profile-image"
                onError={(e) => {
                  e.target.src = defaultProfilePic;
                  console.log(profile.profile_pic);
                }}
              />

              {editMode && (
              <>
                  <label
                  htmlFor="profileUpload"
                  className="camera-button"
                  >
                  <Camera size={20} />
                  </label>

                  <input
                  type="file"
                  id="profileUpload"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                  />
              </>
              )}
          </div>

          {!editMode ? (
              <button
              className="edit-profile-btn"
              onClick={() => setEditMode(true)}
              >
              <Pencil size={18} />
              Edit Profile
              </button>
          ) : (
              <div className="profile-action-buttons">

              <button
                  className="cancel-btn"
                  onClick={handleCancel}
              >
                  <X size={18} />
                  Cancel
              </button>

              <button
                  className="save-btn"
                  onClick={handleSave}
              >
                  <Save size={18} />
                  Save Changes
              </button>

              </div>
          )}
          </div>

          {/* FORM */}
          <div className="profile-grid">

          {/* USERNAME */}
          <div className="form-group">

              <label>Username</label>

              <input
              type="text"
              value={profile.username}
              onChange={handleChange}
              disabled={!editMode}
              />

              <small>Cannot be changed</small>

          </div>

          {/* EMAIL */}
          <div className="form-group">

              <label>Email</label>

              <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
              disabled={!editMode}
              />

          </div>

          {/* GENDER */}
          <div className="form-group">

              <label>Gender</label>

              <input
              type="text"
              value={profile.gender}
              disabled
              className="disabled-input"
              />

              <small>Cannot be changed</small>

          </div>

          {/* BIRTHDATE */}
          <div className="form-group">

              <label>Birthdate</label>

              <input
              type="text"
              value={profile.birthdate}
              disabled
              className="disabled-input"
              />

              <small>Cannot be changed</small>

          </div>

          {/* PASSWORD */}
          <div className="form-group full-width">
              <label>Password</label>
              {!editMode ? (
                  <div className="password-wrapper">
                      <input
                          type="password"
                          value="••••••••"
                          disabled
                      />
                  </div>
              ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%" }}>
                      {!isCurrentPasswordVerified ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                              <div className="password-wrapper">
                                  <input
                                      type={showCurrentPassword ? "text" : "password"}
                                      placeholder="Enter current password to change"
                                      value={currentPassword}
                                      onChange={(e) => setCurrentPassword(e.target.value)}
                                  />
                                  <button
                                      type="button"
                                      className="eye-btn"
                                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  >
                                      {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                              </div>
                              <button
                                  type="button"
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
                          <div style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%" }}>
                              <div style={{ color: "#16a34a", fontSize: "14px", fontWeight: "bold" }}>
                                  ✓ Current password verified. You can now set a new password.
                              </div>
                              
                              <div className="password-wrapper">
                                  <input
                                      type={showPassword ? "text" : "password"}
                                      name="password"
                                      placeholder="New Password"
                                      value={profile.password || ""}
                                      onChange={handleChange}
                                  />
                                  <button
                                      type="button"
                                      className="eye-btn"
                                      onClick={() => setShowPassword(!showPassword)}
                                  >
                                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                              </div>

                              <div className="password-wrapper">
                                  <input
                                      type={showConfirmPassword ? "text" : "password"}
                                      placeholder="Confirm New Password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                  />
                                  <button
                                      type="button"
                                      className="eye-btn"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}
              <small style={{ display: "block", marginTop: "5px" }}>
                  Minimum 8 characters, uppercase, lowercase, number, and special character required
              </small>

          </div>

          </div>

      </div>

      </div>
  );
}

export default AdminProfile;