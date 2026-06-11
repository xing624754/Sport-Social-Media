import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { getSports } from "../api/getCategories";
import { getEquipments } from "../api/equipment";

import ratingIcon from "../assets/rating.png";
import { view } from "framer-motion/client";

import "../styles/Equipment.css";

export default function Equipment({ currentUser }){
    const [sports, setSports] = useState([]);
    const [selected, setSelected] = useState(null);      
    const [equipments, setEquipments] = useState([]);         
    const [loading, setLoading] = useState(true);
    const [viewEquipment, setViewEquipment] = useState(null);

    useEffect(() => {
        loadSports();
        setSelected("Recommended");
    }, []);

    useEffect(() => {
        if (selected) {
            loadEquipments(selected);
        }
    }, [selected]);

    const loadSports = async () => {
        try{
            const response = await getSports();
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            setSports(data.data);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const loadEquipments = async (selected) => {
        setLoading(true);

        try{
            const response = await getEquipments(selected, currentUser.userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                setLoading(false);
                return;
            }

            setEquipments(data.equipments || []);
            setLoading(false);
        }
        catch(err){
            toast.error("Network error");
            setLoading(false);
        }
    };

    const handleSportChange = (e) => {
        const selectedValue = e.target.value;
        setSelected(selectedValue);
    }; 

    return(
        <div className="equipment-page">
            <h1>Sports Equipment</h1>

            <div className="filterBar">
                <select value={selected || ""} onChange={handleSportChange}>
                    
                    <option value="Recommended">
                        Recommended
                    </option>

                    {sports.map((s) => (
                        <option key={s.category_id} value={s.category_id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Show loading message */}
            {loading && <p>Loading equipments...</p>}

            {/* Show "no equipments" if empty */}
            {!loading && equipments.length === 0 && <p>No equipment found.</p>}

            {/* Show the eqipments */}
            {!loading && equipments.length > 0 && (
                <div className="equipment-container">
                    {equipments.map((equipment) => (
                        <div 
                            key={equipment.equipment_id} 
                            className="equipment-wrapper"
                            onClick={() => setViewEquipment(equipment)}
                        >
                            <img src={equipment.image_url} alt="equipment photo" />

                            <h3 className="equipment-name">{equipment.name}</h3>

                            <label className="equipment-price">{equipment.price}</label>

                            <div className="equipment-rating">
                                <img src={ratingIcon} alt="rating" />

                                <label>{equipment.rating}</label>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewEquipment && (
                <div className="overlay">
                    <div className="equipment-details">
                        <button
                            className="close-pop-up"
                            type="button"
                            onClick={() => setViewEquipment(null)}
                        >
                            ✕
                        </button>

                        <img src={viewEquipment.image_url} alt="equipment photo" />

                        <h3 className="equipment-name">{viewEquipment.name}</h3>

                        <label className="brand">
                            {viewEquipment.brand}
                        </label>

                        <label className="price">
                            Estimated price: {viewEquipment.price}
                        </label>

                        <div className="rating">
                            <img src={ratingIcon} alt="rating" />

                            <label>{viewEquipment.rating}</label>
                        </div>

                        <p className="description">
                            {viewEquipment.description}
                        </p>

                        {viewEquipment.product_url !== "N/A" && (
                            <a
                                href={viewEquipment.product_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View Product
                            </a>
                        )}

                        {viewEquipment.product_url === "N/A" && (
                            <p>Product link not available</p>
                        )}
                
                    </div>
                </div>
            )}
        </div>
    );
};