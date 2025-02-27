// components/Sidebar.tsx
import Link from "next/link";

export default function Sidebar() {
    return (
        <aside className="w-64 bg-base-300 text-base-content p-6">
            <h2 className="text-3xl font-bold mb-8">Clockwise</h2>
            <nav>
                <ul className="menu">
                    <li>
                        <Link href="/dashboard">Dashboard</Link>
                    </li>
                    <li>
                        <Link href="/register">Uren Registreren</Link>
                    </li>
                    <li>
                        <Link href="/overview">Uren Overzicht</Link>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}
