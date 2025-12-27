import axios from "axios";

export async function login(username: string, password: string, medewGcId: number) {
    const response = await axios.post("http://localhost:5000/api/auth/login",
        { username, password },
        {
            headers: {
                "X-MEDEW-GC-ID": medewGcId.toString()
            }
        }
    );
    return response.data;
}
