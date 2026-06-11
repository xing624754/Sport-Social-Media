import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

import { checkSession } from "../api/auth";
import { getAgeGroup, getSkillLevel, getSports } from "../api/getCategories";
import { findPlayer } from "../api/findPlayer";
import Chat from "./Chat";

import UserLayout from "./UserLayout";
import "../styles/FindPlayer.css";

export default function FindPlayer({ currentUser }) {
    const navigate = useNavigate();
    const [userID, setUserID] = useState("");

    useEffect(() => {

        const loadData = async () => {

            setUserID(currentUser.userID);
            await getAgeGroupData();
            await getSkillLevelData();
            await getSportData();
        };

        loadData();
    }, []);

    // user's preferences
    const [gender, setGender] = useState("");
    const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
    const [selectedSport, setSelectedSport] = useState("");
    const [selectedSkillLevel, setSelectedSkillLevel] = useState("");

    // database data
    const [ageGroups, setAgeGroups] = useState([]);
    const [sports, setSports] = useState([]);
    const [skillLevels, setSkillLevels] = useState([]);

    const [step, setStep] = useState(1);

    const [matchedPlayer, setMatchedPlayer] = useState({});

    const getAgeGroupData = async () => {
        try{
            const response = await getAgeGroup();
            const data = await response.json();

            if(!response.ok){
                toast.error(response.error);
            }
            else{
                setAgeGroups(data.data);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const getSportData = async () => {
        try{
            const response = await getSports();
            const data = await response.json();

            if(!response.ok){
                toast.error(response.error);
            }
            else{
                setSports(data.data);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const getSkillLevelData = async () => {
        try{
            const response = await getSkillLevel();
            const data = await response.json();

            if(!response.ok){
                toast.error(response.error);
            }
            else{
                setSkillLevels(data.data);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleFindPlayer = async (e) => {
        e.preventDefault();

        if(!selectedSkillLevel){
            toast.error("Please select a skill level");
            return;
        }

        try{
            const response = await findPlayer(userID, gender, selectedAgeGroup, selectedSport, selectedSkillLevel);
            const data = await response.json();

            if(!response.ok){
                toast.error(response.error);
            }
            else{
                setMatchedPlayer(data.matched_player);
                setStep(5)
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const handleMatchAgain = () => {
        setStep(1);
        setGender("");
        setSelectedAgeGroup("");
        setSelectedSport("");
        setSelectedSkillLevel("");
        setMatchedPlayer({});
    };

    return (
        <div>
            <div className="wrapper" id="find-player-wrapper">
                <h2 id="header">Meet Players Like You</h2>

                <h3 id="quote">Your next teammate is just a few clicks away.</h3>
            
                <form className="find-player-form" onSubmit={handleFindPlayer}>
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                className="select-wrapper"
                                key="step1"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >

                                <label className="select-label">Select a gender</label>
                                

                                <button
                                    className={gender === "Male" ? "select-button selected" : "select-button"}
                                    type="button"
                                    onClick={() => {
                                        setGender("Male");
                                        setStep(2);
                                    }}
                                >
                                    Male
                                </button>
                            
                                <button
                                    className={gender === "Female" ? "select-button selected" : "select-button"}
                                    type="button"
                                    onClick={() => {
                                        setGender("Female");
                                        setStep(2);
                                    }}
                                >
                                    Female
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                className="select-wrapper"
                                key="step2"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="back-button-container">
                                    <button 
                                        className="back-button"
                                        type="button"
                                        onClick={() => {
                                            setStep(1);
                                        }}>
                                        {"< Back"}
                                    </button>
                                </div>

                                <label className="select-label">
                                    Select an age group
                                </label>

                                {ageGroups.map((ageGroup) => (
                                    <button
                                        className={selectedAgeGroup === ageGroup.group_id ? "select-button selected" : "select-button"}
                                        key={ageGroup.group_id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedAgeGroup(ageGroup.group_id);
                                            setStep(3);
                                        }}
                                    >
                                        {
                                            ageGroup.age_from === 0 ? "< 17" :
                                                ageGroup.age_from === 60 ? "> 60" :
                                                `${ageGroup.age_from} - ${ageGroup.to_age}`
                                        }
                                    </button>
                                ))}
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                className="select-wrapper"
                                key="step3"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >

                                <div className="back-button-container">
                                    <button 
                                        className="back-button"
                                        type="button"
                                        onClick={() => {
                                            setStep(2);
                                        }}>
                                        {"< Back"}
                                    </button>
                                </div>

                                <label className="select-label">
                                    Select a sport
                                </label>
                                
                                <div className="sports-container">
                                    {sports.map((sport) => (
                                        <button
                                            className={selectedSport === sport.category_id ? "select-button selected" : "select-button"}
                                            key={sport.category_id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSport(sport.category_id);
                                                setStep(4);
                                            }}
                                        >
                                            {sport.name}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div 
                                className="select-wrapper"
                                key="step4"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >

                                <div className="back-button-container">
                                    <button 
                                        className="back-button"
                                        type="button"
                                        onClick={() => {
                                            setStep(3);
                                        }}>
                                        {"< Back"}
                                    </button>
                                </div>

                                <label className="select-label">
                                    Select a skill level
                                </label>

                                {skillLevels.map((skillLevel) => (
                                    <button
                                        className={selectedSkillLevel === skillLevel.skill_level_id ? "select-button selected" : "select-button"}
                                        key={skillLevel.skill_level_id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedSkillLevel(skillLevel.skill_level_id);
                                        }}
                                    >
                                        {skillLevel.name}
                                    </button>
                                ))}

                                <br />

                                <button 
                                    className="match-button"
                                    type="submit" 
                                >
                                    Find Your Match! 
                                </button>
                            </motion.div>
                        )}

                        {step === 5 && (
                            <motion.div 
                                className="select-wrapper"
                                key="step5"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="match-result-header">We found a match for you!</h2>

                                <div className="result-container">
                                    <div className="result-wrapper" id="user-wrapper">
                                        <label 
                                            className="result-user-label"
                                            onClick={() => {navigate(`/user/profile/${matchedPlayer.user_id}`)}}
                                        >
                                            @{matchedPlayer.username}
                                        </label>

                                        <label>
                                            {matchedPlayer.score}% Matched
                                        </label>
                                    </div>

                                    <div className="result-wrapper" id="gender-wrapper">
                                        <label className="result-label">
                                            Gender
                                        </label>
                                        <p>
                                            {matchedPlayer.gender}
                                        </p>
                                    </div>

                                    <div className="result-wrapper" id="age-wrapper">
                                        <label className="result-label">
                                            Age
                                        </label>
                                        <p>
                                            {matchedPlayer.age}
                                        </p>
                                    </div>
                                    
                                    <div className="result-wrapper" id="sport-wrapper">
                                        <label className="result-label">
                                            Sport
                                        </label>
                                        <p>
                                            {matchedPlayer.matched_sport === "" ? 
                                            "Not Matched" : `${matchedPlayer.matched_sport} (Matched)`}
                                        </p>
                                    </div>
                                    
                                    <div className="result-wrapper" id="skill-level-wrapper">
                                        <label className="result-label">
                                            Skill Level
                                        </label>
                                        <p>
                                            {matchedPlayer.matched_skill_level === "" ? 
                                            "Not Matched" : `${matchedPlayer.matched_skill_level} (Matched)`}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    className="match-button"
                                    type="button"
                                    onClick={handleMatchAgain}
                                >
                                    Find Another Match
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
    
};