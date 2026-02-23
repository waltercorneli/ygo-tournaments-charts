"use client";

import { TournamentData } from "../hooks/useTournamentInfos";

interface Props {
  data: TournamentData;
  setField: (
    field: keyof TournamentData,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TournamentChart({ data, setField }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Torneo
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Nome torneo — full width */}
        <div className="col-span-2 flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Nome torneo
          </label>
          <input
            type="text"
            value={data.name}
            onChange={setField("name")}
            placeholder="es. YGO Regional Milano"
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Data */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Data
          </label>
          <input
            type="date"
            value={data.date}
            onChange={setField("date")}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Luogo */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Luogo
          </label>
          <input
            type="text"
            value={data.location}
            onChange={setField("location")}
            placeholder="es. Milano"
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Partecipanti */}
        <div className="col-span-2 flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Partecipanti
          </label>
          <input
            type="number"
            min={1}
            value={data.participants}
            onChange={setField("participants")}
            placeholder="es. 128"
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>
    </div>
  );
}
