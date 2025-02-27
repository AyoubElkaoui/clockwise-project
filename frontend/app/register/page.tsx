"use client";
import { useEffect, useState } from "react";
import { getCompanies, getProjectGroups, getProjects, registerTimeEntry } from "@/lib/api";

export default function RegisterTime() {
    const [companies, setCompanies] = useState([]);
    const [projectGroups, setProjectGroups] = useState([]);
    const [projects, setProjects] = useState([]);

    const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
    const [selectedProjectGroup, setSelectedProjectGroup] = useState<number | null>(null);
    const [selectedProject, setSelectedProject] = useState<number | null>(null);

    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [distanceKm, setDistanceKm] = useState(0);
    const [travelCosts, setTravelCosts] = useState(0);
    const [expenses, setExpenses] = useState(0);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        getCompanies().then(setCompanies).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedCompany !== null) {
            getProjectGroups(selectedCompany).then(setProjectGroups).catch(console.error);
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (selectedProjectGroup !== null) {
            getProjects(selectedProjectGroup).then(setProjects).catch(console.error);
        }
    }, [selectedProjectGroup]);

    const handleSubmit = async () => {
        if (!selectedProject) {
            alert("Selecteer een project");
            return;
        }

        const data = {
            userId: 1, // Voorlopig test user
            projectId: selectedProject,
            startTime,
            endTime,
            breakMinutes,
            distanceKm,
            travelCosts,
            expenses,
            notes,
        };

        try {
            await registerTimeEntry(data);
            alert("Uren opgeslagen!");
        } catch (error) {
            console.error(error);
            alert("Fout bij opslaan");
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Uren Registreren</h1>
            <div className="card bg-base-100 shadow-xl p-8">
                <div className="form-control mb-4">
                    <label className="label">
                        <span className="label-text">Bedrijf</span>
                    </label>
                    <select
                        value={selectedCompany ?? ""}
                        onChange={(e) => setSelectedCompany(Number(e.target.value))}
                        className="select select-bordered"
                    >
                        <option value="">Selecteer een bedrijf</option>
                        {companies.map((comp: any) => (
                            <option key={comp.id} value={comp.id}>
                                {comp.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedCompany && (
                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">Projectgroep</span>
                        </label>
                        <select
                            value={selectedProjectGroup ?? ""}
                            onChange={(e) => setSelectedProjectGroup(Number(e.target.value))}
                            className="select select-bordered"
                        >
                            <option value="">Selecteer een projectgroep</option>
                            {projectGroups.map((pg: any) => (
                                <option key={pg.id} value={pg.id}>
                                    {pg.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedProjectGroup && (
                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text">Project</span>
                        </label>
                        <select
                            value={selectedProject ?? ""}
                            onChange={(e) => setSelectedProject(Number(e.target.value))}
                            className="select select-bordered"
                        >
                            <option value="">Selecteer een project</option>
                            {projects.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Starttijd</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="input input-bordered"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Eindtijd</span>
                        </label>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="input input-bordered"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Pauze (min)</span>
                        </label>
                        <input
                            type="number"
                            value={breakMinutes}
                            onChange={(e) => setBreakMinutes(Number(e.target.value))}
                            className="input input-bordered"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Afstand (km)</span>
                        </label>
                        <input
                            type="number"
                            value={distanceKm}
                            onChange={(e) => setDistanceKm(Number(e.target.value))}
                            className="input input-bordered"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Reiskosten</span>
                        </label>
                        <input
                            type="number"
                            value={travelCosts}
                            onChange={(e) => setTravelCosts(Number(e.target.value))}
                            className="input input-bordered"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Onkosten</span>
                        </label>
                        <input
                            type="number"
                            value={expenses}
                            onChange={(e) => setExpenses(Number(e.target.value))}
                            className="input input-bordered"
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Opmerkingen</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="textarea textarea-bordered"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    className="btn btn-primary mt-8 w-full"
                >
                    Opslaan
                </button>
            </div>
        </div>
    );
}
