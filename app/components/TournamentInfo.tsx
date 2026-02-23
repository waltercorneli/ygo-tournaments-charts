"use client";

import { TournamentData } from "../hooks/useTournamentInfos";

interface Props {
  data: TournamentData;
}

export function TournamentInfo({ data }: Props) {
  const hasAny = Object.values(data).some((v) => v.trim() !== "");

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 px-5 py-4 text-center">
        {data.name && (
          <h2 className="text-6xl font-extrabold tracking-tight text-gray-900">
            {data.name}
          </h2>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-2xl text-gray-600">
          {[
            data.date &&
              new Date(data.date).toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            data.location,
            data.participants && `${data.participants} partecipanti`,
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
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg">
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
