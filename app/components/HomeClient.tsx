"use client";

import { useState } from "react";
import { PlayerChart } from "./PlayerChart";
import { PlayersTop } from "./PlayersTop";
import { DecksChart } from "./DecksChart";
import { PieChart } from "./PieChart";
import { useDecksInfos } from "../hooks/useDecksInfos";
import { usePlayersInfos } from "../hooks/usePlayersInfos";

export function HomeClient() {
  const playersInfos = usePlayersInfos(4);

  const [decks, setDecks] = useState<string[]>(["", "", "", "OTHER"]);

  const handleDeckChange = (index: number, value: string) =>
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
      <div className="flex flex-col gap-8">
        <PlayerChart {...playersInfos} />

        <DecksChart
          decks={decks}
          onChange={handleDeckChange}
          onAdd={addDeck}
          onRemove={removeDeck}
          onClear={clearDecks}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Pie Chart</h2>
          <div className="max-w-4xl">
            <PieChart {...chartData} />
          </div>
        </div>
        <PlayersTop players={playersInfos.players} />
      </div>
    </main>
  );
}
