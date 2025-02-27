import axios from "axios";

export async function getUsers() {
    try {
        const res = await axios.get("http://localhost:5203/api/users", {
            headers: { "Content-Type": "application/json" },
            withCredentials: false // Zorg dat dit false is om CORS issues te vermijden
        });
        return res.data;
    } catch (error) {
        console.error("API Call Failed:", error);
        throw error;
    }
}
