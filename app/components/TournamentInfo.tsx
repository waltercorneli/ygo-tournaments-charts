"use client";

import { TournamentData } from "../hooks/useTournamentInfos";

interface Props {
  data: TournamentData;
  participants?: number;
  isDark?: boolean;
}

export function TournamentInfo({ data, participants, isDark = false }: Props) {
  const hasAny =
    Object.values(data).some((v) => v.trim() !== "") ||
    (participants !== undefined && participants > 0);

  if (!hasAny) return null;

  return (
    <div className="relative flex items-center">
      <div className="w-full px-5 py-4 text-center">
        {data.name && (
          <h2
            className={`text-[1.8rem] font-extrabold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}
          >
            {data.name}
          </h2>
        )}

        <div
          className={`mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.75rem] ${isDark ? "text-gray-300" : "text-gray-600"}`}
        >
          {[
            data.date &&
              new Date(data.date).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            data.location,
            participants !== undefined && participants > 0
              ? `${participants} partecipanti`
              : undefined,
          ]
            .filter(Boolean)
            .map((item, i, arr) => (
              <span key={i} className="flex items-center gap-3">
                {item}
                {i < arr.length - 1 && <span className="text-gray-300">|</span>}
              </span>
            ))}
        </div>
      </div>

      {data.logoUrl && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[7.5rem] w-[7.5rem] flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg">
          <img
            src={data.logoUrl}
            alt="Logo fumetteria"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
