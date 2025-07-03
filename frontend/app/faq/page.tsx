import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Faq from "@/components/faq";
import Sidebar from "@/components/Sidebar";

export default function Home() {
    return (
        <><Navbar />
            <Faq />
        </>
    )
}
