"use client";
import { useState, useEffect } from "react";
import {
  registerWorkTimeEntry,
  getWorkTasks,
  getProjects,
  getPeriods,
} from "@/lib/api";
import { showToast } from "@/components/ui/toast";

export default function RegisterTime() {
  const [urenperGcId, setUrenperGcId] = useState(1); // Default
  const [taakGcId, setTaakGcId] = useState(30); // Default work task
  const [werkGcId, setWerkGcId] = useState(1); // Default project
  const [aantal, setAantal] = useState("");
  const [datum, setDatum] = useState(new Date().toISOString().split("T")[0]);
  const [omschrijving, setOmschrijving] = useState("");

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const t = await getWorkTasks();
      setTasks(t);
      const p = await getProjects(1); // Assume group 1
      setProjects(p);
      const per = await getPeriods(10);
      setPeriods(per);
    };
    loadData();
  }, []);

  const handleSubmit = async () => {
    const entry = {
      TaakGcId: taakGcId,
      WerkGcId: werkGcId,
      Aantal: parseFloat(aantal),
      Datum: datum,
      GcOmschrijving: omschrijving,
    };
    try {
      await registerWorkTimeEntry(urenperGcId, [entry]);
      showToast("Uren succesvol opgeslagen!", "success");
    } catch (error) {
      showToast("Fout bij opslaan", "error");
    }
  };

  return (
    <div>
      <h1>Uren Registratie</h1>
      <select
        value={urenperGcId}
        onChange={(e) => setUrenperGcId(Number(e.target.value))}
      >
        {periods.map((p: any) => (
          <option key={p.GcId} value={p.GcId}>
            {p.GcCode}
          </option>
        ))}
      </select>
      <select
        value={taakGcId}
        onChange={(e) => setTaakGcId(Number(e.target.value))}
      >
        {tasks.map((t: any) => (
          <option key={t.GcId} value={t.GcId}>
            {t.GcCode}
          </option>
        ))}
      </select>
      <select
        value={werkGcId}
        onChange={(e) => setWerkGcId(Number(e.target.value))}
      >
        {projects.map((p: any) => (
          <option key={p.GcId} value={p.GcId}>
            {p.GcCode}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={aantal}
        onChange={(e) => setAantal(e.target.value)}
        placeholder="Aantal uren"
      />
      <input
        type="date"
        value={datum}
        onChange={(e) => setDatum(e.target.value)}
      />
      <input
        type="text"
        value={omschrijving}
        onChange={(e) => setOmschrijving(e.target.value)}
        placeholder="Omschrijving"
      />
      <button onClick={handleSubmit}>Opslaan</button>
    </div>
  );
}
