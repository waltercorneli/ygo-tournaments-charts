# YGO Tournaments Charts

A web application for generating 1080×1080 px infographics of Yu-Gi-Oh! tournament results, designed for organizers and communities such as YGO Frosinone.

## What it is and what it does

**YGO Tournaments Charts** lets you compose a square graphic in real time (ideal format for Instagram/social media) summarizing the outcome of a YGO tournament, displaying:

- **Deck distribution** via an interactive pie chart, with card artworks automatically fetched from the [YGOProDeck](https://db.ygoprodeck.com/api-guide/) API
- **Top players leaderboard** with name, deck and final position (🥇🥈🥉)
- **Tournament info** (name, date, location, number of participants, store logo)
- **Team/organizer info** with a customizable logo

Once configured, the graphic can be exported as a high-resolution PNG (3240×3240 px at pixel ratio 3×) with a single click.

---

## Main features

### Left panel — data input

| Section          | What you configure                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| **Player Chart** | Names and decks of the top players (Top 1–N)                                                               |
| **Decks List**   | List of decks used in the tournament with the number of players and an optional custom artwork search term |
| **Tournament**   | Tournament name, date, location and store logo (uploaded from file or chosen from `/public/logos/`)        |
| **Background**   | Background image with an opacity slider                                                                    |
| **Options**      | Dark/light mode, show/hide Team Info box, toggle between pie chart slice labels and a side deck bar chart  |

### Live preview — 1080×1080 canvas

The right panel shows the graphic in real time, scaled to fit the screen. The fixed 1080 px layout ensures fonts, padding and proportions are always consistent with the final export.

### Interactive pie chart

- Each slice displays the deck artwork as a fill image
- Clicking a slice opens a **picker** that lets you:
  - Choose from artworks available on YGOProDeck (prev/next pagination)
  - Upload a custom image from your device
  - Adjust the artwork's scale and position using a slider and a 2D drag pad

### PNG export

The **Export PNG** button generates a `<tournament-name>.png` file at 3240×3240 px (pixel ratio 3×), ready for publishing.

---

## Tech stack

- **[Next.js 15](https://nextjs.org/)** (App Router) — full-stack React framework
- **[Chart.js](https://www.chartjs.org/)** — pie chart and bar chart rendering
- **[html-to-image](https://github.com/bubkoo/html-to-image)** — DOM-to-PNG export
- **[Tailwind CSS](https://tailwindcss.com/)** — utility-first styling
- **TypeScript** — static typing

### Internal API routes

| Route                                 | Purpose                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `GET /api/deck-artwork?name=&offset=` | Proxy to YGOProDeck to fetch deck artworks (6 results per page) |
| `GET /api/card-image?url=`            | Image proxy to bypass CORS restrictions on YGOProDeck URLs      |
| `GET /api/logos`                      | Lists files in `/public/logos/` to populate the logo selector   |

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production build

```bash
npm run build
npm start
```

---

## Project structure

```
app/
├── page.tsx                  # Entry point
├── layout.tsx                # Global layout
├── globals.css
├── api/
│   ├── card-image/route.ts   # Card image proxy
│   ├── deck-artwork/route.ts # YGOProDeck artwork proxy
│   └── logos/route.ts        # Store logo list
├── components/
│   ├── HomeClient.tsx         # Main component (layout + export)
│   ├── PieChart.tsx           # Interactive pie chart with artwork picker
│   ├── DecksBarChart.tsx      # Side deck bar chart
│   ├── DecksChart.tsx         # Deck input form
│   ├── PlayerChart.tsx        # Top player input form
│   ├── PlayersTop.tsx         # Leaderboard box in the graphic
│   ├── TeamInfo.tsx           # Team/organizer info box
│   ├── TournamentChart.tsx    # Tournament data input form
│   ├── TournamentInfo.tsx     # Tournament header in the graphic
│   └── BackgroundImage.tsx    # Background image selector
├── hooks/
│   ├── useDecksInfos.ts       # Computes labels/data/colors for the pie chart
│   ├── useDeckArtworks.ts     # Fetches artworks from YGOProDeck
│   ├── usePlayersInfos.ts     # Top player state management
│   └── useTournamentInfos.ts  # Tournament data state management
public/
├── logos/                     # Selectable store logos
└── images/                    # Static assets
```
