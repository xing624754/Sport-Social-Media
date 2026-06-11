import { useState, useEffect } from "react";
import { forgotPassword } from "../api/auth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthHeader from "../components/AuthHeader";

import "../styles/AuthCommon.css";
import "../styles/ForgotPassword.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [cooldown, setCooldown] = useState(0);

    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (cooldown > 0) return;

        try{
            const response = await forgotPassword(email);
            const data = await response.json();

            if(response.ok){
                toast.success(data.message);
                setCooldown(60); // only allows users to send another email after 60 secs
            }
            else{
                toast.error(data.error);
            }
        } catch(err){
            toast.error("Network error")
        }
    };

    // countdown effect
    useEffect(() => {
        if (cooldown > 0){
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    return (
        <div className="auth-page">
            <AuthHeader />
            
            <div className="wrapper">
                <h2 className="quote">Reset Password</h2>

                <form className="auth-form" id="reset-form" onSubmit={handleForgotPassword}>
                    <p>
                        <Link id="back-link" to="/login">{"<"} Back</Link>
                    </p>

                    <br />

                    <label className="input-labels">
                        Email
                        <input 
                            className="email-input"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={cooldown > 0}
                            required
                        />
                    </label>

                    <br /><br />

                    <button className="action-button" id="send-email-button" type="submit" disabled={cooldown > 0}>
                        {cooldown > 0 ? `Wait ${cooldown}s to resend` : "Send Email"}
                    </button>
                </form>
            </div>
        </div>
    );
};