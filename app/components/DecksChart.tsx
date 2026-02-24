"use client";

import { DeckEntry } from "../hooks/useDecksInfos";

interface DecksInputProps {
  decks: DeckEntry[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, field: keyof DeckEntry, value: string) => void;
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
    <div className="shrink-0 flex flex-col gap-2 p-3">
      <h1 className="text-2xl font-bold mb-4">Decks List</h1>
      {/* Column headers — hidden on mobile, shown on desktop */}
      <div className="hidden md:flex items-center gap-2 px-0.5">
        <span className="w-14 shrink-0" />
        <div className="flex flex-1 items-center gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Deck Name
          </span>
          <span
            title="Nome del deck. Viene mostrato come label nel grafico a torta. Se vuoto, la fetta viene raggruppata in OTHER."
            className="cursor-help text-gray-400 hover:text-gray-600 text-xs"
          >
            ⓘ
          </span>
        </div>
        <div className="w-28 flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Deck Image
          </span>
          <span
            title="Termine usato per cercare l'artwork del deck tramite l'API YGOProDeck. Utile per deck ibridi (es. scrivi 'Snake-Eyes' invece di 'Snake-Eyes Fiendsmith'). Se vuoto, usa il Deck Name."
            className="cursor-help text-gray-400 hover:text-gray-600 text-xs"
          >
            ⓘ
          </span>
        </div>
        <div className="w-24 flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Qtà
          </span>
          <span
            title="Numero di giocatori che hanno usato questo deck nel torneo."
            className="cursor-help text-gray-400 hover:text-gray-600 text-xs"
          >
            ⓘ
          </span>
        </div>
        {/* spacer for the − button */}
        <span className="w-8 shrink-0" />
      </div>

      <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
        {decks.map((deck, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2"
          >
            {/* Row 1 (mobile) / single row (desktop): label + name + remove */}
            <div className="flex items-center gap-2">
              <label className="text-xs shrink-0 w-14">Deck {index + 1}</label>
              <input
                type="text"
                value={deck.name}
                onChange={(e) => onChange(index, "name", e.target.value)}
                placeholder="Deck Name (vuoto = OTHER)"
                title="Nome mostrato nel grafico"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {/* Remove button: visible on mobile in row 1, hidden on desktop */}
              <button
                onClick={() => onRemove(index)}
                title="Rimuovi"
                className="md:hidden px-2.5 py-1 rounded border border-red-300 bg-red-50 text-red-700 font-bold cursor-pointer hover:bg-red-100 shrink-0"
              >
                −
              </button>
            </div>

            {/* Row 2 (mobile) / continues on desktop: image search + qty stepper + remove */}
            <div className="flex items-center gap-2 pl-16 md:pl-0 md:contents">
              <input
                type="text"
                value={deck.imageSearch ?? ""}
                onChange={(e) => onChange(index, "imageSearch", e.target.value)}
                placeholder="Deck Image (opz.)"
                title="Termine usato per cercare l'artwork. Lascia vuoto per usare il Deck Name."
                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-300 md:w-28 md:flex-none"
              />
              {/* Qty stepper */}
              <div className="flex items-center border border-gray-300 rounded overflow-hidden shrink-0 w-24">
                <button
                  onClick={() =>
                    onChange(index, "qty", String(Math.max(1, deck.qty - 1)))
                  }
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border-r border-gray-300"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={deck.qty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1) onChange(index, "qty", String(v));
                  }}
                  className="flex-1 min-w-0 py-1 text-xs text-center bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => onChange(index, "qty", String(deck.qty + 1))}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border-l border-gray-300"
                >
                  +
                </button>
              </div>
              {/* Remove button: hidden on mobile (shown in row 1), visible on desktop */}
              <button
                onClick={() => onRemove(index)}
                title="Rimuovi"
                className="hidden md:block px-2.5 py-1 rounded border border-red-300 bg-red-50 text-red-700 font-bold cursor-pointer hover:bg-red-100 shrink-0"
              >
                −
              </button>
            </div>
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
