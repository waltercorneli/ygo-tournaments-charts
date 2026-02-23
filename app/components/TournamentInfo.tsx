"use client";

import { TournamentData } from "../hooks/useTournamentInfos";

interface Props {
  data: TournamentData;
}

export function TournamentInfo({ data }: Props) {
  const hasAny = Object.values(data).some((v) => v.trim() !== "");

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
      {data.name && (
        <h2 className="text-5xl font-extrabold tracking-tight text-indigo-900">
          {data.name}
        </h2>
      )}

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-lg text-indigo-700">
        {data.date && (
          <span className="flex items-center gap-1">
            <span className="text-indigo-400">📅</span>
            {new Date(data.date).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
        {data.location && (
          <span className="flex items-center gap-1">
            <span className="text-indigo-400">📍</span>
            {data.location}
          </span>
        )}
        {data.participants && (
          <span className="flex items-center gap-1">
            <span className="text-indigo-400">👥</span>
            {data.participants} partecipanti
          </span>
        )}
      </div>
    </div>
  );
}
