export const checkSession = async () => {
    return await fetch("/auth/check-session", {
        credentials: "include"
    });
};

export const login = async (username, password, rememberMe) => {
    // sends a request to backend, waits for Flask to respond and stores the reply from Flask
    return await fetch("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json" 
        },
        credentials: "include",
        body: JSON.stringify({
            username,
            password,
            remember: rememberMe
        })
    });
};

export const forgotPassword = async (email) => {
    return await fetch("/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            email
        })
    });
};

export const resetPassword = async (token, password, confirmPassword) => {
    return await fetch(`/auth/reset-password/${token}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            password,
            confirmPassword
        })
    });
};

export const signup = async (email, birthdate, username, password, gender, selectedSports) => {
    return await fetch("/auth/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            email,
            birthdate,
            username,
            password,
            gender,
            selectedSports
        })
    });
};

export const logout = async () => {
    return await fetch("/auth/logout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include"
    });
};
