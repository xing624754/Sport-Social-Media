import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "../styles/AddAds.css";

import { Upload, X } from "lucide-react";

function AddAds() {

  const navigate = useNavigate();

  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");

  const [logoImage, setLogoImage] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaUrls, setMediaUrls] = useState([]);

  const handleRemoveSpecificMedia = (indexToRemove) => {

    const updatedFiles = mediaFiles.filter(
      (_, index) => index !== indexToRemove
    );

    const updatedUrls = mediaUrls.filter(
      (_, index) => index !== indexToRemove
    );

    setMediaFiles(updatedFiles);
    setMediaUrls(updatedUrls);
  };

  const handleCreateAdvertisement = async () => {

    try {

      const formData = new FormData();

      formData.append(
        "brand_name",
        brandName
      );

      formData.append(
        "description",
        description
      );

      formData.append(
        "end_date",
        endDate
      );

      if (logoImage) {

        formData.append(
          "logo_image",
          logoImage
        );
      }

      mediaFiles.forEach((file) => {

        formData.append(
          "ad_images",
          file
        );
      });

      await axios.post(
        "/api/advertisements",
        formData,
        {
          headers: {
            "Content-Type":
            "multipart/form-data",
          },
        }
      );

      alert(
        "Advertisement created successfully"
      );

      navigate("/admin/ads");

    } catch (error) {

      console.log(error);

      alert(
        error.response?.data?.error ||
        "Failed to create advertisement"
      );
    }
  };

  return (

    <>

    <div className="add-ads-page">

      <div className="add-ads-container">

        <h2 className="add-ads-title">
          Create Advertisement
        </h2>

        <div className="add-ads-grid">

          {/* LEFT */}
          <div>

            <div className="upload-section" style={{ marginBottom: "20px" }}>
                <label className="upload-title">Brand Name</label>

                <input
                  type="text"
                  placeholder="Brand Name"
                  className="form-input"
                  value={brandName}
                  onChange={(e) =>
                    setBrandName(e.target.value)
                  }
                />
            </div>

            <div className="upload-section" style={{ marginBottom: "20px" }}>
                <label className="upload-title">End Date</label>

                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(e.target.value)
                  }
                />
            </div>

            <div className="upload-section" style={{ marginBottom: "20px" }}>
                <label className="upload-title">Advertisement Description</label>
                <textarea
                  placeholder="Description"
                  className="form-textarea"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                />

            </div>
          </div>

          {/* RIGHT */}
          <div>

            {/* LOGO */}
            <div className="upload-section">

              <label className="upload-title">
                Brand Logo
              </label>

              <label className="upload-box">

                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => {

                    const file =
                      e.target.files[0];

                    if (!file) return;

                    setLogoImage(file);

                    setLogoPreview(
                      URL.createObjectURL(file)
                    );
                  }}
                />

                {logoPreview ? (

                  <img
                    src={logoPreview}
                    className="preview-logo"
                  />

                ) : (

                  <div className="upload-placeholder">

                    <div className="upload-icon">
                      <Upload size={24} />
                    </div>

                    <p>
                      Upload Brand Logo
                    </p>

                  </div>

                )}

              </label>

              <span className="upload-hint" style={{ display: "block", marginTop: "6px", fontSize: "0.85rem", color: "#666" }}>
                  Recommend to upload square image for brand logo
              </span>

            </div>

            {/* MEDIA */}
            <div className="upload-section">

              <label className="upload-title">
                Advertisement Pictures / Videos
              </label>

              <label className="upload-box large-upload">

                <input
                  type="file"
                  multiple
                  hidden
                  accept="image/*,video/*"
                  onChange={(e) => {

                    const files = Array.from(
                      e.target.files
                    );

                    const totalFiles =
                      mediaFiles.length +
                      files.length;

                    if (totalFiles > 9) {

                      alert(
                        "Maximum 9 files allowed"
                      );

                      return;
                    }

                    const updatedFiles = [
                      ...mediaFiles,
                      ...files
                    ];

                    setMediaFiles(
                      updatedFiles
                    );

                    const newPreview =
                      files.map((file) => ({

                        url: URL.createObjectURL(file),

                        type: file.type

                      }));

                    setMediaUrls([
                      ...mediaUrls,
                      ...newPreview
                    ]);
                  }}
                />

                <div className="upload-placeholder">

                  <div className="upload-icon">
                    <Upload size={24} />
                  </div>

                  <p>
                    Upload Advertisement Media
                  </p>

                  <span>
                    Maximum 9 files
                  </span>

                </div>

              </label>

              {/* PREVIEW */}
              {mediaUrls.length > 0 && (

                <div className="multiple-preview-container">

                  {mediaUrls.map(
                    (media, index) => (

                    <div
                      key={index}
                      className="preview-image-wrapper"
                    >

                      {media.type.startsWith(
                        "video/"
                      ) ? (

                        <video
                          src={media.url}
                          className="multi-preview-image"
                          muted
                          controls
                        />

                      ) : (

                        <img
                          src={media.url}
                          className="multi-preview-image"
                          alt=""
                        />

                      )}

                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() =>
                          handleRemoveSpecificMedia(
                            index
                          )
                        }
                      >
                        <X size={14} />
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

        {/* BUTTONS */}
        <div className="add-ads-buttons">

          <button
            className="cancel-btn"
            onClick={() =>
              navigate("/admin/home")
            }
          >
            Cancel
          </button>

          <button
            className="create-btn"
            onClick={
              handleCreateAdvertisement
            }
          >
            Create Advertisement
          </button>

        </div>

      </div>

    </div>

    </>
  );
}

export default AddAds;