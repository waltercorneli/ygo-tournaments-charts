"use client";

export interface PlayerEntry {
  name: string;
  deck: string;
}

interface PlayerChartProps {
  players: PlayerEntry[];
  onChange: (index: number, field: keyof PlayerEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

export function PlayerChart({
  players,
  onChange,
  onAdd,
  onRemove,
  onClear,
}: PlayerChartProps) {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Player Chart</h1>
      <div className="flex flex-col gap-2">
        {players.map((player, index) => (
          <div key={index} className="flex items-center gap-2">
            <label className="text-sm shrink-0 w-14">Top {index + 1}</label>
            <input
              type="text"
              value={player.name}
              onChange={(e) => onChange(index, "name", e.target.value)}
              placeholder={`Player ${index + 1}`}
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="text"
              value={player.deck}
              onChange={(e) => onChange(index, "deck", e.target.value)}
              placeholder="Deck"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={() => onRemove(index)}
              title="Rimuovi player"
              className="px-3 py-1 rounded border border-red-300 bg-red-50 text-red-700 font-bold cursor-pointer hover:bg-red-100"
            >
              −
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onAdd}
            title="Aggiungi player"
            className="px-4 py-1.5 text-lg rounded border border-gray-300 bg-gray-100 cursor-pointer hover:bg-gray-200"
          >
            +
          </button>
          <button
            onClick={onClear}
            title="Svuota tutti i campi"
            className="px-4 py-1.5 rounded border border-gray-300 bg-yellow-50 cursor-pointer hover:bg-yellow-100"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
