import { useEffect, useState } from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import axios from "axios";

import "../styles/EditAds.css";

import {
  Upload,
  X
} from "lucide-react";

function EditAds() {

    const navigate = useNavigate();

    const { advertisement_id } = useParams();


    // STATES
    const [brandName, setBrandName] = useState("");

    const [description, setDescription] = useState("");

    const [endDate, setEndDate] = useState("");

    // LOGO
    const [logoImage, setLogoImage] = useState(null);

    const [logoPreview, setLogoPreview] = useState(null);

    // NEW MEDIA
    const [mediaFiles, setMediaFiles] = useState([]);

    const [mediaUrls, setMediaUrls] = useState([]);

    // EXISTING MEDIA
    const [existingMedia, setExistingMedia] = useState([]);

    const [removedExistingMedia, setRemovedExistingMedia] = useState([]);


  // =========================
  // FETCH SINGLE AD
  // =========================

  useEffect(() => {

    fetchAdvertisement();

  }, [advertisement_id]);

  const fetchAdvertisement = async () => {

    try {

      const response =
        await axios.get(
          "/api/advertisements"
        );

      const ad =
        response.data.find(
          (item) =>
            item.advertisement_id ===
            Number(advertisement_id)
        );

      if (!ad) {

        alert(
          "Advertisement not found"
        );

        navigate("/admin/ads");

        return;
      }

      setBrandName(
        ad.brand_name || ""
      );

      setDescription(
        ad.description || ""
      );

      setEndDate(
        ad.end_date || ""
      );

      // LOGO
      setLogoPreview(
        ad.logo_image
          ? `/api${ad.logo_image}`
          : null
      );

      // EXISTING MEDIA
      setExistingMedia(
        ad.media_urls || []
      );

    } catch (error) {

      console.log(error);
    }
  };

  // =========================
  // REMOVE NEW MEDIA
  // =========================

    const handleRemoveSpecificMedia =
        (indexToRemove) => {

            const updatedFiles =
            mediaFiles.filter(
                (_, index) =>
                index !== indexToRemove
            );

            const updatedUrls =
            mediaUrls.filter(
                (_, index) =>
                index !== indexToRemove
            );

            setMediaFiles(updatedFiles);

            setMediaUrls(updatedUrls);
        };

    const handleRemoveExistingMedia = (
        mediaUrlToRemove
    ) => {

        setExistingMedia(
            existingMedia.filter(
            (url) => url !== mediaUrlToRemove
            )
        );

        setRemovedExistingMedia([
            ...removedExistingMedia,
            mediaUrlToRemove
        ]);
    };

  // =========================
  // UPDATE
  // =========================

  const handleUpdateAdvertisement =
    async () => {

      try {

        const formData =
          new FormData();

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

        // LOGO
        if (logoImage) {

          formData.append(
            "logo_image",
            logoImage
          );
        }

        // NEW MEDIA
        mediaFiles.forEach((file) => {

            formData.append(
                "ad_images",
                file
            );
        });

        // REMOVED EXISTING MEDIA
        formData.append(
            "removed_existing_media",
            JSON.stringify(
                removedExistingMedia
            )
        );

        await axios.put(
          `/api/advertisements/${advertisement_id}`,
          formData,
          {
            headers: {
              "Content-Type":
              "multipart/form-data",
            },
          }
        );

        alert(
          "Advertisement updated successfully"
        );

        navigate("/admin/ads");

      } catch (error) {

        console.log(
          error.response?.data || error
        );

        alert(
          "Failed to update advertisement"
        );
      }
    };

  return (

    <>

      <div className="add-ads-page">

        <div className="add-ads-container">

          <h2 className="add-ads-title">
            Edit Advertisement
          </h2>

          <div className="add-ads-grid">

            {/* LEFT */}
            <div>

              <input
                type="text"
                placeholder="Brand Name"
                className="form-input"
                value={brandName}
                onChange={(e) =>
                  setBrandName(
                    e.target.value
                  )
                }
              />

              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) =>
                  setEndDate(
                    e.target.value
                  )
                }
              />

              <textarea
                placeholder="Description"
                className="form-textarea"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />

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

              </div>

              {/* MEDIA */}
              <div className="upload-section">

                <label className="upload-title">
                  Advertisement Media
                </label>

                <label className="upload-box large-upload">

                  <input
                    type="file"
                    multiple
                    hidden
                    accept="image/*,video/*"
                    onChange={(e) => {

                      const files =
                        Array.from(
                          e.target.files
                        );

                      const totalFiles =
                        existingMedia.length +
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
                        files.map((file) =>
                          URL.createObjectURL(file)
                        );

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

                {/* EXISTING MEDIA */}
                {existingMedia.length > 0 && (

                    <div className="multiple-preview-container">

                        {existingMedia.map(
                        (url, index) => {

                            const fullUrl =
                            `/api${url}`;

                            const isVideo =
                            /\.(mp4|webm|ogg|mov)$/i.test(url);

                            return (

                            <div
                                key={index}
                                className="preview-image-wrapper"
                            >

                                {isVideo ? (

                                <video
                                    src={fullUrl}
                                    className="multi-preview-image"
                                    controls
                                />

                                ) : (

                                <img
                                    src={fullUrl}
                                    className="multi-preview-image"
                                />

                                )}

                                <button
                                type="button"
                                className="remove-image-btn"
                                onClick={() =>
                                    handleRemoveExistingMedia(
                                    url
                                    )
                                }
                                >
                                <X size={14} />
                                </button>

                            </div>

                            );
                        }
                        )}

                    </div>

                )}

                {/* NEW MEDIA */}
                {mediaUrls.length > 0 && (

                  <div className="multiple-preview-container">

                    {mediaUrls.map(
                      (url, index) => {

                        const isVideo =
                          /\.(mp4|webm|ogg|mov)$/i.test(url);

                        return (

                          <div
                            key={index}
                            className="preview-image-wrapper"
                          >

                            {isVideo ? (

                              <video
                                src={url}
                                className="multi-preview-image"
                                controls
                              />

                            ) : (

                              <img
                                src={url}
                                className="multi-preview-image"
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

                        );
                      }
                    )}

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
                navigate("/admin/ads")
              }
            >
              Cancel
            </button>

            <button
              className="create-btn"
              onClick={
                handleUpdateAdvertisement
              }
            >
              Update Advertisement
            </button>

          </div>

        </div>

      </div>

    </>
  );
}

export default EditAds;