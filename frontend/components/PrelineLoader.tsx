"use client";
import { useEffect } from "react";

export default function PrelineLoader() {
    useEffect(() => {
        if (typeof window !== "undefined") {
            import("preline/preline");
        }
    }, []);

    return null;
}
