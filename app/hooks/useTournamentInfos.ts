import { useState } from "react";

export interface TournamentData {
  name: string;
  date: string;
  location: string;
  participants: string;
}

const INITIAL: TournamentData = {
  name: "",
  date: "",
  location: "",
  participants: "",
};

export function useTournamentInfos() {
  const [data, setData] = useState<TournamentData>(INITIAL);

  const setField =
    (field: keyof TournamentData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((prev) => ({ ...prev, [field]: e.target.value }));

  return { data, setField };
}
