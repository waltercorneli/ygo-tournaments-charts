"use client";

import { useState, useRef } from "react";
import { toPng } from "html-to-image";
import { PlayerChart } from "./PlayerChart";
import { PlayersTop } from "./PlayersTop";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { BackgroundImage } from "./BackgroundImage";
import { TournamentInfo } from "./TournamentInfo";
import { TournamentChart } from "./TournamentChart";
import { useDecksInfos, DeckEntry } from "../hooks/useDecksInfos";
import { usePlayersInfos } from "../hooks/usePlayersInfos";
import { useTournamentInfos } from "../hooks/useTournamentInfos";

export function HomeClient() {
  const playersInfos = usePlayersInfos(4);

  const [decks, setDecks] = useState<DeckEntry[]>([
    { name: "Snake-Eye", qty: 28 },
    { name: "Yubel", qty: 22 },
    { name: "Branded", qty: 18 },
    { name: "Tenpai Dragon", qty: 15 },
    { name: "OTHER", qty: 45 },
  ]);

  const handleDeckChange = (
    index: number,
    field: keyof DeckEntry,
    value: string,
  ) =>
    setDecks((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "qty" ? Math.max(1, Number(value)) : value,
      };
      return updated;
    });

  const addDeck = () =>
    setDecks((prev) => [...prev, { name: "", qty: 1, imageSearch: "" }]);
  const removeDeck = (index: number) =>
    setDecks((prev) => prev.filter((_, i) => i !== index));
  const clearDecks = () =>
    setDecks((prev) =>
      prev.map(({ name, imageSearch }) => ({ name, qty: 1, imageSearch })),
    );

  const chartData = useDecksInfos(decks);

  const { data: tournamentData, setField: setTournamentField } =
    useTournamentInfos();

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(15);

  const handleBgChange = (url: string | null, opacity: number) => {
    setBgUrl(url);
    setBgOpacity(opacity);
  };

  const exportRef = useRef<HTMLDivElement>(null);

  const exportPng = async () => {
    if (!exportRef.current) return;
    const dataUrl = await toPng(exportRef.current, { pixelRatio: 3 });
    const link = document.createElement("a");
    link.download = `${tournamentData.name || "torneo"}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Build imageSearch overrides map: label → imageSearch term
  const imageSearchOverrides = Object.fromEntries(
    decks
      .filter((d) => d.imageSearch?.trim())
      .map((d) => {
        const label =
          d.name.trim() === "" ? "OTHER" : d.name.trim().toUpperCase();
        return [label, d.imageSearch!.trim()] as const;
      }),
  );

  return (
    <main className="flex min-h-screen w-full gap-8 p-8">
      <div className="flex flex-col gap-8">
        <PlayerChart {...playersInfos} />

        <DecksChart
          decks={decks}
          onChange={handleDeckChange}
          onAdd={addDeck}
          onRemove={removeDeck}
          onClear={clearDecks}
        />

        <TournamentChart data={tournamentData} setField={setTournamentField} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-8">
        <BackgroundImage onImageChange={handleBgChange} />

        <div className="flex justify-end">
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200"
          >
            ⬇ Esporta PNG
          </button>
        </div>

        {/* Measured outer container */}
        <div
          ref={exportRef}
          className="relative w-full aspect-square rounded-xl overflow-hidden"
        >
          {/* faded background */}
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
              style={{ opacity: bgOpacity / 100 }}
            />
          )}

          {/* foreground content */}
          <div className="relative h-full flex flex-col gap-6 p-8">
            <TournamentInfo data={tournamentData} />
            <div className="flex-1 min-h-0">
              <PieChart
                {...chartData}
                imageSearchOverrides={imageSearchOverrides}
              />
            </div>
            <PlayersTop players={playersInfos.players} />
          </div>
        </div>
      </div>
    </main>
  );
}
