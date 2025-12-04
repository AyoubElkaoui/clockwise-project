"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function RegisterTime() {
    const [hours, setHours] = useState("");

    const handleSubmit = async () => {
        await fetch(`${API_URL}/time-entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hours: Number(hours) }),
        });

        alert("Uren opgeslagen!");
    };

    return (
        <div>
            <h1>Uren Registratie</h1>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} />
            <button onClick={handleSubmit}>Opslaan</button>
        </div>
    );
}
