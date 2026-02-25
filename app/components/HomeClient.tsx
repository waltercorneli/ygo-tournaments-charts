"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { PlayerChart } from "./PlayerChart";
import { EXPORT_SIZE, exportPng } from "../utils/exportPng";
import { buildImageSearchOverrides } from "../utils/deckUtils";
import { PlayersTop } from "./PlayersTop";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { BackgroundImage } from "./BackgroundImage";
import { TournamentInfo } from "./TournamentInfo";
import { TournamentChart } from "./TournamentChart";
import { TeamInfo } from "./TeamInfo";
import { DecksBarChart } from "./DecksBarChart";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { useDecksInfos, DeckEntry } from "../hooks/useDecksInfos";
import { usePlayersInfos } from "../hooks/usePlayersInfos";
import { useTournamentInfos } from "../hooks/useTournamentInfos";

export function HomeClient() {
  const playersInfos = usePlayersInfos(4);

  const [decks, setDecks] = useState<DeckEntry[]>([
    { name: "Snake-Eye", qty: 8 },
    { name: "Yubel", qty: 2 },
    { name: "Branded", qty: 1 },
    { name: "Tenpai Dragon", qty: 5 },
    { name: "OTHER", qty: 5 },
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

  const [deckImages, setDeckImages] = useState<Record<string, string>>({});
  const [deckImageSettings, setDeckImageSettings] = useState<
    Record<string, { scale: number; offsetX: number; offsetY: number }>
  >({});

  const [bgUrl, setBgUrl] = useState<string | null>(
    "/images/plane-background.webp",
  );
  const [bgOpacity, setBgOpacity] = useState(15);
  const [isDark, setIsDark] = useState(true);
  const [isDarkPanels, setIsDarkPanels] = useState(true);
  const [panelOpacity, setPanelOpacity] = useState(15);
  const [darkPieStroke, setDarkPieStroke] = useState(true);
  const [showTeamInfo, setShowTeamInfo] = useState(true);
  const [showSideChart, setShowSideChart] = useState(true);
  const [proportionalBars, setProportionalBars] = useState(true);
  const [progressivePctFont, setProgressivePctFont] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Tracks whether any mobile picker (PieChart or PlayersTop) is open.
  const [piePickerOpen, setPiePickerOpen] = useState(false);
  const [playersPickerOpen, setPlayersPickerOpen] = useState(false);
  const anyPickerOpen = piePickerOpen || playersPickerOpen;
  // iOS: show the generated image in a full-screen modal so the user can
  // long-press to save it (window.open / link.click are unreliable on iOS).
  const [iosImageUrl, setIosImageUrl] = useState<string | null>(null);

  // Ref filled by PieChart — returns a canvas data URL only after all artwork
  // images are fully loaded and painted (fixes iOS first-load blank canvas).
  const chartSnapshotRef = useRef<(() => Promise<string>) | null>(null);

  // Lock body scroll while the mobile drawer is open so the page
  // behind the backdrop cannot be scrolled by touch.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    document.body.style.touchAction = isMenuOpen ? "none" : "";
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isMenuOpen]);

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

  const handleExportPng = async () => {
    if (!exportRef.current) return;
    await exportPng({
      exportEl: exportRef.current,
      chartSnapshotRef,
      tournamentName: tournamentData.name,
      setExportStatus,
      setIosImageUrl,
    });
  };

  // Build imageSearch overrides map: label → imageSearch term
  const imageSearchOverrides = buildImageSearchOverrides(decks);

  return (
    <div className="flex flex-col w-full">
      <AppHeader
        onMenuToggle={() => setIsMenuOpen((p) => !p)}
        isMenuOpen={isMenuOpen}
      />

      {/* Mobile backdrop */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main className="flex h-screen w-full gap-4 p-4 md:gap-8 md:p-8 overflow-hidden">
        {/* Left column — drawer on mobile, static on desktop */}
        <div
          className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-2xl
            flex flex-col gap-8 overflow-y-auto overflow-x-hidden p-4
            transition-transform duration-300
            ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}
            md:static md:inset-y-auto md:left-auto md:z-auto md:w-auto
            md:shadow-none md:translate-x-0 md:bg-transparent md:p-0
            md:transition-none
          `}
        >
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

          <BackgroundImage onImageChange={handleBgChange} />

          <div className="flex flex-col gap-2 p-3">
            <button
              onClick={() => setShowSideChart((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                showSideChart
                  ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {showSideChart ? "📊 Template 2" : "🏷️ Template 1"}
            </button>
            <div className="border-t border-gray-200 mt-1 mb-1" />
            <button
              onClick={() => setIsDark((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 w-full justify-center"
            >
              {isDark ? "☀️ Modalità chiara" : "🌙 Modalità notte"}
            </button>
            <button
              onClick={() => setIsDarkPanels((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 w-full justify-center"
            >
              {isDarkPanels ? "☀️ Specchietti chiari" : "🌙 Specchietti scuri"}
            </button>
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-gray-500 flex-shrink-0">
                Opacità
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={panelOpacity}
                onChange={(e) => setPanelOpacity(Number(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-gray-500 w-8 text-right">
                {panelOpacity}%
              </span>
            </div>
            <button
              onClick={() => setDarkPieStroke((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                darkPieStroke
                  ? "border-gray-300 bg-gray-100 hover:bg-gray-200"
                  : "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              }`}
            >
              {darkPieStroke ? "⬛ Stroke scuro" : "⬜ Stroke chiaro"}
            </button>
            <button
              onClick={() => setShowTeamInfo((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                showTeamInfo
                  ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gray-300 bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {showTeamInfo ? "🏠 Nascondi Team Info" : "🏠 Mostra Team Info"}
            </button>
            {showSideChart && (
              <button
                onClick={() => setProportionalBars((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                  proportionalBars
                    ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300 bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {proportionalBars ? "📏 % sul totale" : "📏 Relativo al max"}
              </button>
            )}
            {showSideChart && (
              <button
                onClick={() => setProgressivePctFont((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border w-full justify-center ${
                  progressivePctFont
                    ? "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300 bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {progressivePctFont ? "🔡 Font progressivo" : "🔡 Font fisso"}
              </button>
            )}
            <button
              onClick={handleExportPng}
              disabled={exportStatus !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-gray-300 bg-gray-100 hover:bg-gray-200 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⬇ Esporta PNG
            </button>
          </div>
        </div>

        {/* Chart preview */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 md:gap-8">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div
              ref={containerRef}
              className="aspect-square h-full relative overflow-hidden"
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
                className={`overflow-hidden ${isDark ? "bg-gray-900" : "bg-white"}`}
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
                  <TournamentInfo
                    data={tournamentData}
                    participants={decks.reduce((sum, d) => sum + d.qty, 0)}
                    isDark={isDark}
                  />
                  <div className="flex-1 min-h-0 relative">
                    <div className="h-full">
                      <PieChart
                        {...chartData}
                        imageSearchOverrides={imageSearchOverrides}
                        isDark={isDark}
                        darkStroke={darkPieStroke}
                        showLabels={!showSideChart}
                        showSlicePercentages={showSideChart}
                        progressivePctFont={progressivePctFont}
                        extraPaddingLeft={showSideChart ? 850 : 0}
                        onImagesChange={setDeckImages}
                        onImageSettingsChange={setDeckImageSettings}
                        snapshotRef={chartSnapshotRef}
                        onPickerChange={setPiePickerOpen}
                      />
                    </div>
                    {showSideChart && (
                      <div className="absolute top-0 left-0 w-1/4">
                        <DecksBarChart
                          {...chartData}
                          isDark={isDarkPanels}
                          sliceImages={deckImages}
                          panelOpacity={panelOpacity}
                          proportional={proportionalBars}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 items-stretch w-[90%] mx-auto min-h-[15%] p-8">
                    <div className="flex-[6] min-w-0">
                      <PlayersTop
                        players={playersInfos.players}
                        isDark={isDarkPanels}
                        isDarkTitle={isDark}
                        panelOpacity={panelOpacity}
                        sliceImages={deckImages}
                        imageSettings={deckImageSettings}
                        onPickerChange={setPlayersPickerOpen}
                      />
                    </div>
                    {showTeamInfo && (
                      <div className="flex-[1] min-w-0">
                        <TeamInfo
                          isDark={isDarkPanels}
                          isDarkTitle={isDark}
                          panelOpacity={panelOpacity}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer — visible only on scroll */}
      <AppFooter />

      {/* Single mobile hint banner — hidden as soon as any picker opens */}
      {!anyPickerOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[20] border-t border-gray-200 bg-white shadow-2xl">
            <p className="px-4 py-3 text-center text-xs text-gray-400">
              Tocca una fetta o un&apos;immagine del mazzo per cambiarla
            </p>
          </div>,
          document.body,
        )}

      {/* Export progress overlay */}
      {exportStatus !== null && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-8 py-6 shadow-2xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <p className="text-sm font-medium text-gray-700">{exportStatus}</p>
          </div>
        </div>
      )}

      {/* iOS save modal — long-press the image to save */}
      {iosImageUrl !== null && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90"
          onClick={() => setIosImageUrl(null)}
        >
          <p className="mb-3 text-sm font-medium text-white select-none">
            Tieni premuta l&apos;immagine per salvarla
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iosImageUrl}
            alt="Export"
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="mt-4 rounded-full bg-white/20 px-5 py-2 text-sm text-white"
            onClick={() => setIosImageUrl(null)}
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
