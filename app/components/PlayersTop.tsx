import { Fragment } from "react";
import { PlayerEntry } from "./PlayerChart";

const POSITIONS = ["🥇", "🥈", "🥉", "🥉"];

const TROPHY_COLORS = [
  "bg-yellow-400 text-white", // 1° oro
  "bg-gray-300 text-white", // 2° argento
  "bg-amber-600 text-white", // 3° bronzo
  "bg-gray-900 text-white", // 4° nero
];

interface PlayersTopProps {
  players: PlayerEntry[];
  isDark?: boolean;
  isDarkTitle?: boolean;
  panelOpacity?: number;
}

export function PlayersTop({
  players,
  isDark = false,
  isDarkTitle = isDark,
  panelOpacity = 60,
}: PlayersTopProps) {
  const filled = players.filter((p) => p.name.trim() !== "");

  if (filled.length === 0) return null;

  const cols = Math.ceil(filled.length / 2);

  // Riordina in column-major: 1° e 2° in colonna 1, 3° e 4° in colonna 2, ecc.
  const ordered = Array.from({ length: players.length }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const origIndex = col * 2 + row;
    return { player: players[origIndex] ?? players[i], origIndex };
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      <h2
        className={`text-[0.875rem] font-bold ${isDarkTitle ? "text-white" : "text-gray-900"}`}
      >
        CLASSIFICA
      </h2>
      <div
        className={`w-full flex-1 rounded border px-5 py-4 backdrop-blur-[4px] ${isDark ? "border-gray-600/70" : "border-gray-200/70"}`}
        style={{
          backgroundColor: isDark
            ? `rgba(31,41,55,${panelOpacity / 100})`
            : `rgba(249,250,251,${panelOpacity / 100})`,
        }}
      >
        <div
          className="grid items-center gap-x-2 gap-y-2 h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, auto auto auto 1fr auto 1fr)`,
            gridTemplateRows: "repeat(2, 1fr)",
          }}
        >
          {ordered.map(({ player, origIndex }, i) => (
            <Fragment key={i}>
              <span className="text-[0.9375rem] leading-none">
                {POSITIONS[origIndex] ?? "🎖️"}
              </span>
              <span
                className={`text-[1rem] font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}
              >
                {origIndex + 1}°
              </span>
              <span
                className={`text-[1rem] ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                |
              </span>
              <span
                className={`font-semibold text-[1rem] truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {player.name.trim() || "—"}
              </span>
              <span
                className={`text-[1rem] ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                |
              </span>
              <span
                className={`text-[1rem] truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {player.deck.trim() || "—"}
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
