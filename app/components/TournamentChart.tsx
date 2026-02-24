"use client";

import { useEffect, useRef, useState } from "react";
import { TournamentData } from "../hooks/useTournamentInfos";

interface Props {
  data: TournamentData;
  setField: (
    field: keyof Omit<TournamentData, "logoUrl">,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  setLogoUrl: (url: string) => void;
}

export function TournamentChart({ data, setField, setLogoUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoList, setLogoList] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/logos")
      .then((r) => r.json())
      .then(({ logos }: { logos: string[] }) => setLogoList(logos))
      .catch(() => {});
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

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

        {/* Logo fumetteria */}
        <div className="col-span-2 flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Logo fumetteria
          </label>

          {/* Select from existing logos */}
          {logoList.length > 0 && (
            <select
              value={
                logoList.includes(data.logoUrl.replace("/logos/", ""))
                  ? data.logoUrl.replace("/logos/", "")
                  : ""
              }
              onChange={(e) =>
                setLogoUrl(e.target.value ? `/logos/${e.target.value}` : "")
              }
              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">— nessuno —</option>
              {logoList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs border border-dashed border-gray-300 rounded hover:border-indigo-400 hover:text-indigo-500 text-gray-500 transition-colors"
            >
              {data.logoUrl ? "🖼 Cambia logo" : "＋ Carica logo"}
            </button>
            {data.logoUrl && (
              <>
                <img
                  src={data.logoUrl}
                  alt="logo"
                  className="h-8 w-8 rounded object-contain border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="px-2 py-1 text-xs rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Rimuovi
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
      </div>
    </div>
  );
}
