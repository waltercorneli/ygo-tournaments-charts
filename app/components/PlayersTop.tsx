import { PlayerEntry } from "./PlayerChart";

const TROPHY_ICONS = ["🥇", "🥈", "🥉", "🏅"];

const CARD_STYLES = [
  "border-yellow-400 bg-yellow-50",
  "border-gray-400 bg-gray-50",
  "border-amber-600 bg-amber-50",
  "border-blue-300 bg-blue-50",
];

interface PlayersTopProps {
  players: PlayerEntry[];
}

export function PlayersTop({ players }: PlayersTopProps) {
  const filled = players.filter((p) => p.name.trim() !== "");

  if (filled.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Top Players</h2>
      <div className="grid grid-cols-2 gap-4">
        {players.map((player, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 ${CARD_STYLES[index] ?? "border-gray-200 bg-white"}`}
          >
            <span className="text-3xl">{TROPHY_ICONS[index] ?? "🏅"}</span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base truncate">
                {player.name.trim() || "—"}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {player.deck.trim() || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
