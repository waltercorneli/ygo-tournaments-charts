import { useState } from "react";

export interface TournamentData {
  name: string;
  date: string;
  location: string;
  logoUrl: string;
}

const INITIAL: TournamentData = {
  name: "YGO Regional Milano",
  date: "2026-02-23",
  location: "Milano",
  logoUrl: "",
};

export function useTournamentInfos() {
  const [data, setData] = useState<TournamentData>(INITIAL);

  const setField =
    (field: keyof Omit<TournamentData, "logoUrl">) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((prev) => ({ ...prev, [field]: e.target.value }));

  const setLogoUrl = (url: string) =>
    setData((prev) => ({ ...prev, logoUrl: url }));

  return { data, setField, setLogoUrl };
}
