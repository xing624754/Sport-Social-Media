import "../styles/AuthHeader.css";
import logo from "../assets/Sportify.png";

export default function AuthHeader() {
    return(
        <div className="logo-wrapper">
            <img className="logo" src={logo} alt="Sportify logo" />
            <h1 className="app-name">Sportify</h1>
        </div>
    );
}