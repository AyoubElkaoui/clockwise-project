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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <div className="card bg-base-100 shadow-xl w-full max-w-6xl mx-auto">
      <div className="card-body">
        <h2 className="card-title mb-4">{t("week.projectsTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>{t("week.client")}</th>
                <th>{t("week.project")}</th>
                <th>{t("week.component")}</th>
                <th>{t("week.startDate")}</th>
                <th>{t("week.deadline")}</th>
                <th>{t("week.budgeted")}</th>
                <th>{t("week.hoursWritten")}</th>
                <th>{t("week.remainingToSpend")}</th>
                <th>{t("week.actions")}</th>
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
                          data-tip={t("week.moveUp")}
                          onClick={() => onMoveUp && onMoveUp(row.id)}
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                          data-tip={t("week.moveDown")}
                          onClick={() => onMoveDown && onMoveDown(row.id)}
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                          data-tip={t("week.duplicate")}
                          onClick={() => onDuplicate && onDuplicate(row.id)}
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-bottom text-error"
                          data-tip={t("common.delete")}
                          onClick={() => onDelete && onDelete(row.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        className="btn btn-ghost btn-xs tooltip tooltip-bottom"
                        data-tip={t("week.moreInfo")}
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
                    {t("week.noProjectsFound")}
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
