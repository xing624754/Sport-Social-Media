import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSkillLevel } from "../api/getCategories";
import { getSports } from "../api/getCategories";
import { signup } from "../api/auth";
import { toast } from "react-toastify";

import AuthHeader from "../components/AuthHeader";

import "../styles/AuthCommon.css";
import "../styles/Signup.css";

export default function Signup() {
    const [email, setEmail] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [gender, setGender] = useState("");
    const [sports, setSports] = useState([]);
    const [skillLevels, setSkillLevels] = useState([]);

    // stores selected sports and skill levels
    // format - {sportID: value,
    //           sportName: value,
    //           skillLevelID: value,
    //           skillLevelName: value}
    const [selectedSports, setSelectedSports] = useState([]);
    // stores the state of dropdown box
    const [openDropdown, setOpenDropdown] = useState(null)
    
    const today = new Date().toISOString().split("T")[0];

    const navigate = useNavigate();

    const getSkillLevelData = async () => {
        try{
            const getSkillLevelResponse = await getSkillLevel();

            if(!getSkillLevelResponse.ok){
                toast.error(getSkillLevelResponse.error);
            }
            else{
                const data = await getSkillLevelResponse.json();
                setSkillLevels(data.data);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const getSportsData = async () => {
        try{
            const getSportsResponse = await getSports();

            if(!getSportsResponse.ok){
                toast.error(getSportsResponse.error);
            }
            else{
                const data = await getSportsResponse.json();
                setSports(data.data);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        const loadData = async () => {

            await getSkillLevelData();
            await getSportsData();
        };

        loadData();

    }, []);

    const handleSkillSelect = (sportID, sportName, skillLevelID, skillLevelName) => {
        
        setSelectedSports((prev) => {
            const filtered = prev.filter(
                (s) => s.sportID !== sportID
            );

            return [
                ...filtered,
                {
                    "sportID": sportID,
                    "sportName": sportName,
                    "skillLevelID": skillLevelID,
                    "skillLevelName": skillLevelName
                }
            ];
        });

        setOpenDropdown(false);
    };

    const handleRemoveSelect = (sportID) => {
        const updatedSelectedSports = selectedSports.filter(
            (selectedSport) => selectedSport.sportID !== sportID
        );

        setSelectedSports(updatedSelectedSports);

        setOpenDropdown(false);
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        try{
            const response = await signup(email, birthdate, username, password, gender, selectedSports);

            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
            }
            else{
                toast.success(data.success);

                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    return(
        <div className="auth-page">
            <AuthHeader />

            <div className="wrapper">
                <h2 className="quote">Become A Sportify Member</h2>

                <form className="auth-form" id="signup-form" onSubmit={handleSignup}>
                    <label className="input-labels">
                        Email
                        <input 
                            className="email-input"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>

                    <br />

                    <label className="input-labels">
                        Birth Date
                        <input
                            className="date-input"
                            type="date"
                            max={today}
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            required
                        />
                    </label>

                    <br />              

                    <label className="input-labels">
                        Username
                        <input
                            className="text-input"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </label>

                    <br />

                    <label className="input-labels">
                        Password
                        <input
                            className="password-input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    <br />

                    <label className="input-labels">
                        Gender
                    </label>

                    <div className="gender">
                        <label>
                            <input
                                type="radio"
                                name="gender"
                                value="male"
                                checked={gender === "male"}
                                onChange={(e) => setGender(e.target.value)}
                                required
                            /> 
                            {" "}Male
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="gender"
                                value="female"
                                checked={gender === "female"}
                                onChange={(e) => setGender(e.target.value)}
                                required
                            /> 
                            {" "}Female
                        </label>
                    </div>

                    <br />

                    <label className="input-labels">Sports & Interests</label>
                    
                    <div className="sports-container">
                        {sports.map((sport) => {
                            // stores the selected skill level name
                            const selectedSkill = selectedSports.find(
                                (s) => s.sportID === sport.category_id
                            );

                            return(
                                <div
                                    key={sport.category_id}
                                >
                                    <button
                                        className={selectedSkill ? "sports-button selected" : "sports-button"} 
                                        type="button"
                                        onClick={() => setOpenDropdown(
                                        openDropdown === sport.category_id ? null : sport.category_id
                                        )}
                                    >
                                        {/*shows sport and skill level if skill is selected*/}
                                        {selectedSkill ? `${sport.name} • ${selectedSkill.skillLevelName}` : sport.name}
                                    </button>

                                    {openDropdown === sport.category_id &&(
                                        <div className="dropdown">
                                            {skillLevels.map((skillLevel) => (
                                                <button
                                                    className="skill-level-button"
                                                    type="button"
                                                    key={skillLevel.skill_level_id}
                                                    onClick={() => 
                                                        handleSkillSelect(sport.category_id, sport.name, 
                                                            skillLevel.skill_level_id, skillLevel.name)
                                                    }
                                                >
                                                    {skillLevel.name}
                                                </button>
                                            ))}

                                            <button
                                                className="remove-selection-button"
                                                type="button"
                                                onClick={() => handleRemoveSelect(sport.category_id)}
                                            >
                                                Remove Selection
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <br />

                    <button className="action-button" type="submit">
                        Sign Up
                    </button>
                
                </form>
            </div>
        </div>
    )
};