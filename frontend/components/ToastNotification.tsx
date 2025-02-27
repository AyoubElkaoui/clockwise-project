// components/ToastNotification.tsx
import React from "react";

interface Props {
    message: string;
    type?: "success" | "error";
}

export default function ToastNotification({ message, type = "success" }: Props) {
    return (
        <div className="toast toast-top toast-end fixed z-50">
            <div className={`alert ${type === "success" ? "alert-success" : "alert-error"}`}>
                <div>
                    <span>{message}</span>
                </div>
            </div>
        </div>
    );
}
