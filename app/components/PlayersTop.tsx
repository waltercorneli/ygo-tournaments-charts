import { PlayerEntry } from "./PlayerChart";

const POSITIONS = ["1°", "2°", "3°", "4°"];

const TROPHY_COLORS = [
  "bg-yellow-400 text-white", // 1° oro
  "bg-gray-300 text-white", // 2° argento
  "bg-amber-600 text-white", // 3° bronzo
  "bg-gray-900 text-white", // 4° nero
];

interface PlayersTopProps {
  players: PlayerEntry[];
}

export function PlayersTop({ players }: PlayersTopProps) {
  const filled = players.filter((p) => p.name.trim() !== "");

  if (filled.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 h-full">
      <h2 className="text-2xl font-bold text-gray-900">CLASSIFICA</h2>
      <div className="w-full flex-1 border border-gray-200/70 bg-gray-50/60 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          {players.map((player, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <span
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${TROPHY_COLORS[index] ?? "bg-gray-900 text-white"}`}
              >
                {POSITIONS[index] ?? `${index + 1}°`}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-3xl text-gray-900 truncate">
                  {player.name.trim() || "—"}
                </span>
                <span className="text-xl text-gray-500 truncate">
                  {player.deck.trim() || "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
