import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { toast } from "react-toastify";
import AuthHeader from "../components/AuthHeader";

import "../styles/AuthCommon.css";
import "../styles/ResetPassword.css";

export default function ResetPassword(){
    const { token } = useParams();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const navigate = useNavigate();

    const handleResetPassword = async (e) => {
        e.preventDefault();
        
        try {
            const response = await resetPassword(token, password, confirmPassword);

            const data = await response.json();

            if(!response.ok){
                if (data.type === "Token invalid"){
                    toast.error(data.error);

                    setTimeout(() => {
                        navigate("/login");
                    }, 2000)
                }
                else{
                    toast.error(data.error);
                }
            }
            else{
                toast.success(data.message);

                setTimeout(() => {
                    navigate("/login");
                }, 2000)
            }
        }
        catch(err){
            toast.error("Network error");
        }
    };

    return (
        <div className="auth-page">
            <AuthHeader />

            <div className="wrapper">
                <h2 className="quote">Reset Password</h2>

                <form className="auth-form" id="reset-password-form" onSubmit={handleResetPassword}>
                    <label className="input-labels">
                        New Password
                        <input 
                            className="password-input"
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    <br />

                    <label className="input-labels">
                        Confirm Password
                        <input 
                            className="password-input"
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </label>

                    <br /><br />

                    <button className="action-button" type="submit">Save New Password</button>
                </form>
            </div>
        </div>
    );
};