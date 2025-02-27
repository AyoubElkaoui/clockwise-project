// components/Navbar.tsx
export default function Navbar() {
    return (
        <nav className="navbar bg-base-100 shadow-md px-6">
            <div className="flex-1">
                <a className="btn btn-ghost normal-case text-xl">Clockwise Urenregistratie</a>
            </div>
            <div className="flex-none">
                <button className="btn btn-error">Uitloggen</button>
            </div>
        </nav>
    );
}
