## Event Seating Frontend

React 18 + TypeScript + Vite application that renders an accessible, high-performance interactive SVG seating map.

### How to run

- **Install dependencies**
  - `cd frontend`
  - `pnpm install`
- **Start dev server**
  - `pnpm dev`

### Tooling

- **Linting**
  - `pnpm lint` runs ESLint (`.eslintrc.cjs`) over `src/**/*.ts,tsx`.
- **Formatting**
  - Prettier is configured via `.prettierrc` (no dedicated script; use your editor or `pnpm prettier` if desired).
- **Tests**
  - `pnpm test` runs Vitest with `jsdom` + Testing Library (`src/App.test.tsx` as an example).
  - `pnpm test:e2e` runs Playwright end-to-end tests (requires Playwright browsers installed locally).

### Architecture

- **Vite + React 18 + TypeScript**: minimal toolchain with fast HMR and strict type checking.
- **Components**
  - `App`: fetches `venue.json`, owns selection state and localStorage persistence.
  - `Seat`: memoized SVG seat glyph with keyboard + pointer interactions.
  - `SummaryPanel`: derived view of selected seats with pricing and subtotal.
- **Types**
  - Centralized in `src/types.ts` for seats and venue map structure.

### Performance strategies

- **SVG rendering**
  - Seats are placed using absolute `x/y` coordinates from `venue.json`; no layout or grid calculations are done at render time.
  - `Seat` is wrapped in `React.memo` so that individual seats only re-render when their props change (e.g., selection or status).
- **State management**
  - Selection is stored as a `Set<string>` of seat IDs to keep membership checks \\(O(1)\\) and minimize derived computations.
  - Derived data (selected seats and subtotal) is computed via `useMemo` to avoid recomputation for large seat collections.
  - Event handlers are stable via `useCallback` to avoid re-renders of memoized children.
- **DOM performance**
  - The map itself sits inside a scrollable container to support large virtual viewports while keeping layout simple.

With a realistic `venue.json` (e.g., 15k+ seats), React’s diffing plus memoization minimizes work per interaction, and selection updates only affect a tiny number of nodes.

### Accessibility & UX

- **Keyboard support**
  - Each seat is focusable (`tabIndex=0`) and exposes `role="button"`.
  - `Enter` and `Space` keys toggle selection.
- **ARIA**
  - Seats include descriptive `aria-label` content (section, row, seat, and status).
  - Focused seat details and subtotal are announced via `aria-live` regions.
- **Focus visibility**
  - Explicit visible focus ring styles for focused seats.
- **Responsive layout**
  - Seating map and summary panel stack on small screens and sit side-by-side on larger screens.

### Seat selection logic

- Up to **8 seats** may be selected.
- Clicking or pressing `Enter`/`Space` on a seat:
  - Toggles its membership in the selection set.
  - If the selection already has 8 seats, additional seats are ignored until some are deselected.

### Persistence

- Selected seat IDs are stored in `localStorage` under the key `event-seating-selected-seats`.
- On load, the app restores selection from `localStorage`, then rehydrates against the current `venue.json` data.

### Data format

- `public/venue.json` is fetched at runtime. A simplified example of the expected shape:

```json
{
  "venueId": "grand-theater-01",
  "name": "Grand Theater",
  "map": { "width": 1200, "height": 800 },
  "sections": [
    {
      "id": "A",
      "label": "Orchestra - Left",
      "transform": {
        "x": 0,
        "y": 0,
        "rows": [
          {
            "index": "A",
            "scale": 1,
            "seats": [
              {
                "id": "A1",
                "col": 1,
                "x": 100,
                "y": 100,
                "priceTier": "premium",
                "price": 150,
                "status": "available"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

The app **normalizes** this structure at load time into an internal flat `Seat[]` model using:

- `map.width` / `map.height` for the SVG viewport size.
- `sections[*].transform.rows` or `sections[*].rows` for rows (supports either location).
- Each seat’s `section`, `row`, and `seatNumber` derived from section ID/label, row `index`, and `col`.
- Each seat’s `priceTier` and `price` carried through for pricing and heat-map coloring.

### Trade-offs

- **SVG vs Canvas**: SVG is chosen for accessibility and simpler focus handling, at the cost of larger DOM trees for very large venues. Memoization and simple shapes keep performance acceptable.
- **No global state library**: Local component state with derived values is sufficient for this self-contained view.
- **Pricing**: The frontend trusts `price` and `priceTier` from `venue.json` and does not attempt to recalculate them; in a real system, pricing would likely be provided directly by the backend.

### Optional extras implemented

- **Price heat map toggle**: switch between status-based colors and price-tier-based colors.
- **Find adjacent seats**: choose `N` (1–8) and click “Find block” to auto-select a contiguous block of available seats in the same row.
- **Zoom controls**: range slider to zoom the SVG map while keeping scroll-based panning.
- **Touch gestures**: pinch-zoom and pan support for mobile devices (two-finger pinch to zoom, single-finger drag to pan).
- **WebSocket updates**: mock WebSocket connection that simulates live seat status updates with smooth color transitions (every 3–5 seconds, a random seat’s status changes).
- **Dark mode**: toggleable, with preference persisted in `localStorage`.
- **E2E tests**: basic Playwright smoke test that opens the app and selects a seat.

### TODOs / Possible improvements

- Virtualize seat rendering (e.g., render only visible seats) for extremely large maps.
- Integrate with the backend API to validate seat availability before confirming purchase.


