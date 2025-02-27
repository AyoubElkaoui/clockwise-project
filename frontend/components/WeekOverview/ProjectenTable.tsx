// components/ProjectenTable.tsx
"use client";
import React from "react";
import {
    ArrowUpIcon,
    ArrowDownIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";

export interface ProjectRow {
    id: number;
    klant: string;
    project: string;
    onderdeel: string;
    startdatum: string;
    deadline: string;
    begroot: string;
    urenGeschreven: number;
    nogTeBesteden: string;
}

interface ProjectenTableProps {
    rows: ProjectRow[];
    onMoveUp?: (id: number) => void;
    onMoveDown?: (id: number) => void;
    onDuplicate?: (id: number) => void;
    onDelete?: (id: number) => void;
    onInfo?: (id: number) => void;
}

export default function ProjectenTable({
                                           rows,
                                           onMoveUp,
                                           onMoveDown,
                                           onDuplicate,
                                           onDelete,
                                           onInfo,
                                       }: ProjectenTableProps) {
    return (
        <div className="card bg-base-100 shadow-xl w-full max-w-6xl mx-auto">
            <div className="card-body">
                <h2 className="card-title mb-4">Projecten</h2>
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                        <tr>
                            <th>Klant</th>
                            <th>Project</th>
                            <th>Onderdeel</th>
                            <th>Startdatum</th>
                            <th>Deadline</th>
                            <th>Begroot</th>
                            <th>Uren geschreven</th>
                            <th>Nog te besteden</th>
                            <th>Acties</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>{row.klant}</td>
                                <td>{row.project}</td>
                                <td>{row.onderdeel}</td>
                                <td>{row.startdatum}</td>
                                <td>{row.deadline}</td>
                                <td>{row.begroot}</td>
                                <td>{row.urenGeschreven}</td>
                                <td>{row.nogTeBesteden}</td>
                                <td>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex gap-1">
                                            <button
                                                className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                                                data-tip="Omhoog verplaatsen"
                                                onClick={() => onMoveUp && onMoveUp(row.id)}
                                            >
                                                <ArrowUpIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                                                data-tip="Omlaag verplaatsen"
                                                onClick={() => onMoveDown && onMoveDown(row.id)}
                                            >
                                                <ArrowDownIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                                                data-tip="Dupliceren"
                                                onClick={() => onDuplicate && onDuplicate(row.id)}
                                            >
                                                <DocumentDuplicateIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs tooltip tooltip-bottom text-error"
                                                data-tip="Verwijderen"
                                                onClick={() => onDelete && onDelete(row.id)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                                            data-tip="Meer info"
                                            onClick={() => onInfo && onInfo(row.id)}
                                        >
                                            <InformationCircleIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={9} className="text-center text-gray-500 py-4">
                                    Geen projecten gevonden.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
