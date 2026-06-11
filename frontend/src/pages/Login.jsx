//  imports a React Hook to store user input (memory for inputs)
import { useState } from "react";
import { login } from "../api/auth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import AuthHeader from "../components/AuthHeader";

import "../styles/AuthCommon.css";
import "../styles/Login.css";

// makes this component usable in other files
export default function Login() {

    // creates a state that starts empty -> [currentValue, functionToUpdate]
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();

    // uses async as sending data to Flask takes time
    const handleLogin = async (e) => {
        
        e.preventDefault();
        try{
            // sends a request to backend, waits for Flask to respond and stores the reply from Flask
            const response = await login(username, password, rememberMe);

            const data = await response.json();

            if(response.ok){
                toast.success(data.message);

                const role = data.role;

                setTimeout(() => {
                    // redirects based on role
                    if(role === "User"){
                        window.location.href = "/user/home";
                    }
                    else{
                        window.location.href = "/admin/home";
                    }
                }, 2000)
            }
            else{
                toast.error(data.error);
            }
        }
        catch(err) {
            toast.error("Network error");
        }
        
    };

    return (
        <div className="auth-page">
            <AuthHeader />

            <div className="wrapper">
                <h2 className="quote">Your Game Starts Here.</h2>

                <form className="auth-form" id="login-form" onSubmit={handleLogin}>
                    <label className="input-labels"> 
                        Username
                        <input
                            className="text-input"
                            type="text"
                            placeholder="Enter your username"
                            value={username} // store username in state
                            onChange={(e) => setUsername(e.target.value)} // updates the UI when user types
                            required
                    />
                    </label>
            

                    <br/><br/>

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

                    <br/><br/>

                    <label>
                        <input 
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        {" "}Remember Me
                    </label>

                    <br /><br />

                    <button className="action-button" type="submit">Login</button> 

                    <br /><br />

                    <div className="links">
                        <p>
                            Don't have an account?{" "}
                            <Link to="/signup">Sign up</Link>
                        </p>

                        <p>
                            <Link to="/forgot-password">Forgot password?</Link>
                        </p>
                    </div>
                </form>
                <br />
            </div>
        </div>
    );
};