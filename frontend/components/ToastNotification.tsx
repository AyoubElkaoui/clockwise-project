// components/ToastNotification.tsx
import React from "react";

interface Props {
    message: string;
    type?: "success" | "error";
    onClose?: () => void;
}

export default function ToastNotification({ message, type = "success", onClose }: Props) {
    return (
        <div className="toast toast-top toast-end fixed z-50">
            <div className={`alert ${type === "success" ? "alert-success" : "alert-error"}`}>
                <div>
                    <span>{message}</span>
                </div>
                {onClose && (
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
                )}
            </div>
        </div>
    );
}
