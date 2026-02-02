import axios from "axios";

export async function login(username: string, password: string, twoFactorCode?: string) {
    const response = await axios.post("/api/auth/login", { 
        username, 
        password,
        twoFactorCode 
    });
    return response.data;
}
