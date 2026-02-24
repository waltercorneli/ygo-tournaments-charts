"use client";

import { useState, useRef, useEffect } from "react";
import { toPng } from "html-to-image";
import { PlayerChart } from "./PlayerChart";
import { PlayersTop } from "./PlayersTop";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { BackgroundImage } from "./BackgroundImage";
import { TournamentInfo } from "./TournamentInfo";
import { TournamentChart } from "./TournamentChart";
import { TeamInfo } from "./TeamInfo";
import { DecksBarChart } from "./DecksBarChart";
import { useDecksInfos, DeckEntry } from "../hooks/useDecksInfos";
import { usePlayersInfos } from "../hooks/usePlayersInfos";
import { useTournamentInfos } from "../hooks/useTournamentInfos";

const EXPORT_SIZE = 1080;

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

  const {
    data: tournamentData,
    setField: setTournamentField,
    setLogoUrl: setTournamentLogoUrl,
  } = useTournamentInfos();

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgOpacity, setBgOpacity] = useState(15);
  const [isDark, setIsDark] = useState(true);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [showSideChart, setShowSideChart] = useState(false);

  const handleBgChange = (url: string | null, opacity: number) => {
    setBgUrl(url);
    setBgOpacity(opacity);
  };

  const exportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / EXPORT_SIZE);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const exportPng = async () => {
    if (!exportRef.current) return;
    const el = exportRef.current;
    // Temporarily remove the CSS scale so html-to-image captures the element
    // at its natural 1080×1080 layout size regardless of screen width.
    // Without this, getBoundingClientRect() returns the scaled visual size,
    // causing a mismatch between canvas dimensions and rendered content.
    const prevTransform = el.style.transform;
    el.style.transform = "scale(1)";
    try {
      // pixelRatio 3 → 3240×3240 output
      const dataUrl = await toPng(el, {
        pixelRatio: 3,
        width: EXPORT_SIZE,
        height: EXPORT_SIZE,
      });
      const link = document.createElement("a");
      link.download = `${tournamentData.name || "torneo"}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      el.style.transform = prevTransform;
    }
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

        <TournamentChart
          data={tournamentData}
          setField={setTournamentField}
          setLogoUrl={setTournamentLogoUrl}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-8">
        <BackgroundImage onImageChange={handleBgChange} />

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setIsDark((p) => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200"
          >
            {isDark ? "☀️ Modalità chiara" : "🌙 Modalità notte"}
          </button>
          <button
            onClick={() => setShowTeamInfo((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border ${
              showTeamInfo
                ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-gray-300 bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {showTeamInfo ? "🏠 Nascondi Team Info" : "🏠 Mostra Team Info"}
          </button>
          <button
            onClick={() => setShowSideChart((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border ${
              showSideChart
                ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-gray-300 bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {showSideChart ? "📊 Specchietto deck" : "🏷️ Label fette"}
          </button>
          <button
            onClick={exportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200"
          >
            ⬇ Esporta PNG
          </button>
        </div>

        {/* Outer responsive wrapper — sizes the visible area */}
        <div
          ref={containerRef}
          className="relative w-full aspect-square overflow-hidden rounded-xl"
        >
          {/* Inner div fixed at EXPORT_SIZE × EXPORT_SIZE, then CSS-scaled to fit.
              Layout size stays 1080px so html-to-image captures exactly 1080×1080.
              Chart.js always renders at 1080px → fonts/padding stay proportional. */}
          <div
            ref={exportRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: EXPORT_SIZE,
              height: EXPORT_SIZE,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            className={`rounded-xl overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
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
              <TournamentInfo data={tournamentData} isDark={isDark} />
              <div className="flex-1 min-h-0 relative">
                <div className="h-full">
                  <PieChart
                    {...chartData}
                    imageSearchOverrides={imageSearchOverrides}
                    isDark={isDark}
                    showLabels={!showSideChart}
                    extraPaddingLeft={showSideChart ? 380 : 0}
                  />
                </div>
                {showSideChart && (
                  <div className="absolute top-0 left-0 w-1/4">
                    <DecksBarChart {...chartData} isDark={isDark} />
                  </div>
                )}
              </div>
              <div className="flex gap-4 items-stretch w-[80%] mx-auto min-h-[15%] p-8">
                <div className="flex-[3] min-w-0">
                  <PlayersTop players={playersInfos.players} isDark={isDark} />
                </div>
                {showTeamInfo && (
                  <div className="flex-[1] min-w-0">
                    <TeamInfo isDark={isDark} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
