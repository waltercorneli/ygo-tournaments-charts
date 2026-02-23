"use client";

interface DecksInputProps {
  decks: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  onClear: () => void;
}

export function DecksChart({
  decks,
  onAdd,
  onRemove,
  onChange,
  onClear,
}: DecksInputProps) {
  return (
    <div className="shrink-0 flex flex-col gap-2">
      <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
        {decks.map((deck, index) => (
          <div key={index} className="flex items-center gap-2">
            <label className="text-xs w-14 shrink-0">Deck {index + 1}</label>
            <input
              type="text"
              value={deck}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder="Nome deck (vuoto = OTHER)"
              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={() => onRemove(index)}
              title="Rimuovi"
              className="px-2.5 py-1 rounded border border-red-300 bg-red-50 text-red-700 font-bold cursor-pointer hover:bg-red-100"
            >
              −
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <button
          onClick={onAdd}
          title="Aggiungi deck"
          className="px-4 py-1.5 text-lg rounded border border-gray-300 bg-gray-100 cursor-pointer hover:bg-gray-200"
        >
          +
        </button>
        <button
          onClick={onClear}
          title="Svuota tutti"
          className="px-4 py-1.5 rounded border border-gray-300 bg-yellow-50 cursor-pointer hover:bg-yellow-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
