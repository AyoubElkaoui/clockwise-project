import React from "react";

interface MotivationCardProps {
  name: string;
  workedHours: number;
  targetHours?: number;
  improvement?: number;
}

export default function MotivationCard({
  name,
  workedHours,
  targetHours = 40,
  improvement = 0,
}: MotivationCardProps) {
  const percentage = Math.min((workedHours / targetHours) * 100, 100);

  return (
    <div className="bg-neutral-900 text-white p-6 rounded-2xl shadow-lg flex flex-col gap-3 animate-fade-in">
      <h3 className="text-2xl font-bold flex items-center gap-2">
        💪 Goed bezig, {name}!
      </h3>

      <p className="text-blue-100 text-sm">
        Je hebt deze week <span className="font-semibold text-white">{workedHours}u</span> gewerkt
        ({percentage.toFixed(0)}% van {targetHours}u)
      </p>

      <div className="text-blue-200 text-sm flex items-center gap-2">
        <span>📈 {improvement >= 0 ? "+" : ""}{improvement}%</span>
        <span>meer dan vorige week!</span>
      </div>

      <div className="w-full bg-blue-700/40 h-3 rounded-full mt-2">
        <div
          className="h-3 bg-blue-400 rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl font-medium transition-all duration-200">
        Blijf zo doorgaan!
      </button>
    </div>
  );
}
