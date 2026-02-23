"use client";

import { useState } from "react";
import { PlayerChart } from "./PlayerChart";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { useDecksInfos } from "../hooks/useDecksInfos";

export function HomeClient() {
  const [decks, setDecks] = useState<string[]>(["", "", "", "OTHER"]);

  const handleChange = (index: number, value: string) =>
    setDecks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });

  const addDeck = () => setDecks((prev) => [...prev, ""]);

  const removeDeck = (index: number) =>
    setDecks((prev) => prev.filter((_, i) => i !== index));

  const clearDecks = () => setDecks((prev) => prev.map(() => ""));

  const chartData = useDecksInfos(decks);

  return (
    <main className="flex min-h-screen w-full gap-8 p-8">
      <div className="flex flex-col gap-4">
        <PlayerChart />
        <DecksChart
          decks={decks}
          onChange={handleChange}
          onAdd={addDeck}
          onRemove={removeDeck}
          onClear={clearDecks}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold mb-4">Pie Chart</h2>
        <PieChart {...chartData} />
      </div>
    </main>
  );
}
