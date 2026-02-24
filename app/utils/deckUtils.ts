import type { DeckEntry } from "../hooks/useDecksInfos";

/**
 * Build a map of { DECK_LABEL → imageSearch term } from the deck list.
 * Entries without an imageSearch value are omitted.
 */
export function buildImageSearchOverrides(
  decks: DeckEntry[],
): Record<string, string> {
  return Object.fromEntries(
    decks
      .filter((d) => d.imageSearch?.trim())
      .map((d) => {
        const label =
          d.name.trim() === "" ? "OTHER" : d.name.trim().toUpperCase();
        return [label, d.imageSearch!.trim()] as const;
      }),
  );
}
