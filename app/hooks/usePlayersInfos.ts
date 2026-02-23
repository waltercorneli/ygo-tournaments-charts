import { useState } from "react";
import { PlayerEntry } from "../components/PlayerChart";

export interface PlayersInfos {
  players: PlayerEntry[];
  onChange: (index: number, field: keyof PlayerEntry, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

export function usePlayersInfos(initialCount = 4): PlayersInfos {
  const [players, setPlayers] = useState<PlayerEntry[]>(
    [
      { name: "Mario Rossi", deck: "Snake-Eye" },
      { name: "Luca Bianchi", deck: "Yubel" },
      { name: "Giulia Verdi", deck: "Branded" },
      { name: "Marco Neri", deck: "Tenpai Dragon" },
    ].slice(0, initialCount),
  );

  const onChange = (index: number, field: keyof PlayerEntry, value: string) =>
    setPlayers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  const onAdd = () => setPlayers((prev) => [...prev, { name: "", deck: "" }]);

  const onRemove = (index: number) =>
    setPlayers((prev) => prev.filter((_, i) => i !== index));

  const onClear = () =>
    setPlayers((prev) => prev.map(() => ({ name: "", deck: "" })));

  return { players, onChange, onAdd, onRemove, onClear };
}
