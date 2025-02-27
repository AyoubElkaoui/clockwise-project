import axios from "axios";

export async function login(email: string) {
    const response = await axios.post("http://localhost:5203/api/users/login", { email });
    return response.data;
}
