import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import UserLayout from "./AdminLayout.jsx";

import "../styles/AdminAds.css";

import {
  Plus,
  Trash2,
  Pencil,
  CircleHelp

} from "lucide-react";

function AdminAds() {

  const [advertisements, setAdvertisements] =
    useState([]);

  const navigate = useNavigate();

  // =========================
  // FETCH ADS
  // =========================

  const fetchAdvertisements = async () => {

    try {

      const response = await axios.get(
        "/api/advertisements"
      );

      setAdvertisements(response.data);

    } catch (error) {

      console.log(error);
    }
  };

  useEffect(() => {

    fetchAdvertisements();

  }, []);



  // DELETE
  const handleDelete = async (id) => {

    const confirmDelete =
      window.confirm(
        "Delete this advertisement?"
      );

    if (!confirmDelete) return;

    try {

      await axios.delete(
        `/api/advertisements/${id}`
      );

      fetchAdvertisements();

    } catch (error) {

      console.log(error);
    }
  };




  return (

      <div className="admin-ads-container">

        {/* HEADER */}
        <div className="admin-ads-header">

          <h2 className="admin-ads-title">
            Advertisement Posting
          </h2>

          <button
            onClick={() =>
              navigate("/admin/add-ads")
            }
            className="add-ad-btn"
          >
            <Plus size={20} />
          </button>

        </div>

        {/* TABLE */}
        <div className="ads-table-container">

          <table className="ads-table">

            <thead>

              <tr>

                <th>Brand</th>
                <th>Advertisement Media</th>
                <th>End Date</th>
                <th>Description</th>
                <th>Link</th>
                <th>More</th>

              </tr>

            </thead>

            <tbody>

              {advertisements.length === 0 ? (

                <tr>

                  <td
                    colSpan="6"
                    className="empty-message"
                  >
                    No advertisements found
                  </td>

                </tr>

              ) : (

                advertisements.map((ad) => (

                  <tr
                    key={ad.advertisement_id}
                  >

                    {/* BRAND */}
                    <td>

                      <div className="brand-cell">

                        <img
                          src={`/api${ad.logo_image}`}
                          alt=""
                          className="brand-logo"
                        />

                        <span>
                          {ad.brand_name}
                        </span>

                      </div>

                    </td>

                    {/* MEDIA */}
                    <td>

                      <div className="ads-media-container">

                        {ad.media_urls?.map(
                          (url, index) => {

                            const fullUrl = `/api${url}`;

                            const isVideo =
                              /\.(mp4|webm|ogg|mov)$/i.test(url);

                            return (

                              <div
                                key={index}
                                className="mediaPreviewItem"
                              >

                                {isVideo ? (

                                  <video
                                    className="ads-media-image"
                                    muted
                                    preload="metadata"
                                  >

                                    <source
                                      src={fullUrl}
                                    />

                                  </video>

                                ) : (

                                  <img
                                    src={fullUrl}
                                    alt=""
                                    className="ads-media-image"
                                  />

                                )}

                              </div>

                            );
                          }
                        )}

                      </div>

                    </td>

                    <td>
                      {ad.end_date}
                    </td>

                    <td className="description-cell">
                      {ad.description}
                    </td>

                    <td>

                      {ad.target_url ? (

                        <a
                          href={ad.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="ads-link"
                        >
                          {ad.target_url}
                        </a>

                      ) : (

                        <span>No Link</span>

                      )}

                    </td>

                    <td>

                      <div className="action-buttons">

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/edit-ads/${ad.advertisement_id}`
                            )
                          }
                        >
                          <Pencil size={18} />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              ad.advertisement_id
                            )
                          }
                          className="delete-btn"
                        >
                          <Trash2 size={18} />
                        </button>


                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

  );
}

export default AdminAds;