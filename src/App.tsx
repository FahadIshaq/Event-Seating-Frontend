import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RawRow, RawSection, RawVenue, Seat, VenueMap } from "./types";
import { Seat as SeatComponent } from "./components/Seat";
import { SummaryPanel } from "./components/SummaryPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTouchGestures } from "./hooks/useTouchGestures";

const STORAGE_KEY = "event-seating-selected-seats";

export const App: React.FC = () => {
  const [venue, setVenue] = useState<VenueMap | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedSeat, setFocusedSeat] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectionLimitReached, setSelectionLimitReached] = useState<boolean>(false);
  const [heatmapByPrice, setHeatmapByPrice] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [adjacentCount, setAdjacentCount] = useState<number>(2);
  const [adjacentMessage, setAdjacentMessage] = useState<string | null>(null);
  const [websocketEnabled, setWebsocketEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("event-seating-theme");
    return stored === "dark";
  });
  const [toast, setToast] = useState<{ type: "error" | "info"; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setSelectedIds(new Set(arr));
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("event-seating-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const fetchVenue = async () => {
      try {
        setLoading(true);
        const response = await fetch("/venue.json");
        if (!response.ok) {
          throw new Error(`Failed to load venue.json (${response.status})`);
        }
        const raw: RawVenue = await response.json();

        const seats: Seat[] = [];

        const allSections: RawSection[] = raw.sections ?? [];
        allSections.forEach((section) => {
          const rowsFromSection: RawRow[] = section.rows ?? section.transform.rows ?? [];
          rowsFromSection.forEach((row) => {
            const rowIndex = row.index;
            row.seats.forEach((s) => {
              seats.push({
                id: s.id,
                section: section.label ?? section.id,
                row: String(rowIndex),
                seatNumber: String(s.col),
                x: s.x,
                y: s.y,
                priceTier: s.priceTier,
                price: s.price,
                status: s.status
              });
            });
          });
        });

        const normalized: VenueMap = {
          width: raw.map.width,
          height: raw.map.height,
          seats
        };

        setVenue(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    void fetchVenue();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  // WebSocket: Handle live seat status updates
  const handleSeatStatusUpdate = useCallback(
    (update: { seatId: string; status: Seat["status"] }) => {
      if (!venue) return;

      setVenue((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          seats: prev.seats.map((seat) =>
            seat.id === update.seatId ? { ...seat, status: update.status } : seat
          )
        };
      });
    },
    [venue]
  );

  const { setSeatIds: setWebSocketSeatIds } = useWebSocket({
    enabled: websocketEnabled && !!venue,
    onUpdate: handleSeatStatusUpdate
  });

  useEffect(() => {
    if (venue) {
      setWebSocketSeatIds(venue.seats.map((s) => s.id));
    }
  }, [venue, setWebSocketSeatIds]);

  // Touch gestures: Pinch-zoom and pan
  const handleZoomDelta = useCallback(
    (delta: number) => {
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta * 0.1)));
    },
    []
  );

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setPanX((prev) => prev + deltaX);
    setPanY((prev) => prev + deltaY);
  }, []);

  const touchHandlers = useTouchGestures({
    onZoom: handleZoomDelta,
    onPan: handlePan,
    enabled: true
  });

  const toggleSeatSelection = useCallback(
    (seatId: string) => {
      if (!venue) return;

      const seat = venue.seats.find((s) => s.id === seatId);
      if (!seat) return;

      // Only allow selecting seats that are actually available
      if (seat.status !== "available") {
        setToast({
          type: "error",
          message: `Seat ${seat.seatNumber} in row ${seat.row} is ${seat.status} and cannot be selected.`
        });
        return;
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        const isSelected = next.has(seatId);
        if (isSelected) {
          next.delete(seatId);
          if (next.size < 8) {
            setSelectionLimitReached(false);
          }
          return next;
        }
        if (next.size >= 8) {
          if (!selectionLimitReached) {
            setSelectionLimitReached(true);
            setToast({
              type: "error",
              message: "You can select at most 8 seats. Deselect one to choose another."
            });
          }
          return next;
        }
        next.add(seatId);
        return next;
      });
    },
    [selectionLimitReached, setSelectedIds, venue]
  );

  const selectedSeats = useMemo<Seat[]>(() => {
    if (!venue) return [];
    if (selectedIds.size === 0) return [];

    const byId = new Map(venue.seats.map((s) => [s.id, s]));
    const result: Seat[] = [];
    selectedIds.forEach((id) => {
      const seat = byId.get(id);
      if (seat) {
        result.push(seat);
      }
    });
    return result;
  }, [selectedIds, venue]);

  const handleSeatFocus = useCallback((seat: Seat) => {
    setFocusedSeat(seat);
  }, []);

  const seatsForRender = useMemo<Seat[]>(() => {
    if (!venue) return [];

    const grouped = new Map<string, Seat[]>();
    venue.seats.forEach((seat) => {
      const key = seat.row;
      const existing = grouped.get(key) ?? [];
      existing.push(seat);
      grouped.set(key, existing);
    });

    const sortedRows = Array.from(grouped.keys()).sort();
    const horizontalSpacing = 60;
    const verticalSpacing = 80;
    const offsetX = 100;
    const offsetY = 80;

    const laidOut: Seat[] = [];
    sortedRows.forEach((rowKey, rowIndex) => {
      const rowSeats = grouped
        .get(rowKey)!
        .slice()
        .sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber));
      rowSeats.forEach((seat, seatIndex) => {
        laidOut.push({
          ...seat,
          x: offsetX + seatIndex * horizontalSpacing,
          y: offsetY + rowIndex * verticalSpacing
        });
      });
    });

    return laidOut;
  }, [venue]);

  const rowLabels = useMemo(() => {
    if (!seatsForRender.length) return [];
    const perRow = new Map<
      string,
      {
        x: number;
        y: number;
      }
    >();

    seatsForRender.forEach((seat) => {
      const existing = perRow.get(seat.row);
      if (!existing || seat.x < existing.x) {
        perRow.set(seat.row, { x: seat.x, y: seat.y });
      }
    });

    return Array.from(perRow.entries()).map(([row, pos]) => ({
      row,
      x: pos.x - 40,
      y: pos.y + 4
    }));
  }, [seatsForRender]);

  const handleFindAdjacent = useCallback(() => {
    if (!venue) return;
    const count = Math.max(1, Math.min(8, adjacentCount));
    const byGroup = new Map<string, Seat[]>();

    venue.seats
      .filter((s) => s.status === "available")
      .forEach((s) => {
        const key = `${s.section}-${s.row}`;
        const arr = byGroup.get(key) ?? [];
        arr.push(s);
        byGroup.set(key, arr);
      });

    for (const group of byGroup.values()) {
      group.sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber));
      for (let i = 0; i <= group.length - count; i += 1) {
        const windowSeats = group.slice(i, i + count);
        const first = Number(windowSeats[0].seatNumber);
        const last = Number(windowSeats[windowSeats.length - 1].seatNumber);
        if (last - first === count - 1) {
          const next = new Set<string>();
          windowSeats.forEach((s) => next.add(s.id));
          setSelectedIds(next);
          setSelectionLimitReached(false);
          setAdjacentMessage(null);
          return;
        }
      }
    }

    const message = `No block of ${count} adjacent available seats found.`;
    setAdjacentMessage(message);
    setToast({ type: "error", message });
  }, [adjacentCount, venue]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionLimitReached(false);
    setAdjacentMessage(null);
    setToast(null);
  }, []);

  if (loading) {
    return (
      <div className="app-root">
        <main className="main">
          <p>Loading venue map…</p>
        </main>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="app-root">
        <main className="main">
          <p role="alert">Failed to load venue map: {error ?? "Unknown error"}</p>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-root${darkMode ? " dark" : ""}`}>
      <main className="main">
        <header className="header">
          <div className="header-top">
            <div>
              <h1>Event Seating Map</h1>
              <p>Select up to 8 seats. Use mouse or keyboard (Tab, Enter, Space).</p>
            </div>
            <div className="header-badges">
              <span className="badge">Max 8 seats</span>
              <span className="badge">{selectedIds.size} selected</span>
            </div>
          </div>
          <div className="map-toolbar">
            <label>
              Zoom
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            </label>
            <div className="adjacent-controls">
              <label>
                Find
                <select
                  value={adjacentCount}
                  onChange={(e) => setAdjacentCount(Number(e.target.value))}
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                adjacent seats
              </label>
              <button type="button" onClick={handleFindAdjacent} className="primary-button">
                Find block
              </button>
            </div>
          </div>
          <div className="view-toggle">
            <button
              type="button"
              className={`pill-button${!heatmapByPrice ? " pill-button-active" : ""}`}
              onClick={() => setHeatmapByPrice(false)}
            >
              Standard view
            </button>
            <button
              type="button"
              className={`pill-button${heatmapByPrice ? " pill-button-active" : ""}`}
              onClick={() => setHeatmapByPrice(true)}
            >
              Price heat map
            </button>
            <label className="theme-toggle">
              <span className="theme-toggle-text">Dark mode</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                aria-label="Toggle dark mode"
              />
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb" />
              </span>
            </label>
          </div>
        </header>

        <section className="content">
          <div className="map-container" aria-label="Seating map">
            <div className="stage-chip">STAGE / SCREEN</div>
            <div
              className="map-scroll"
              {...touchHandlers}
              style={{ touchAction: "none" }}
            >
              {websocketEnabled && (
                <div className="websocket-indicator" title="Live seat updates active">
                  Live
                </div>
              )}
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${venue.width} ${venue.height}`}
                role="img"
                aria-label="Venue seating layout"
              >
                <title>Venue seating layout</title>
                <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
                  {rowLabels.map((label) => (
                    <text
                      key={label.row}
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="600"
                      fill="#9ca3af"
                    >
                      {label.row}
                    </text>
                  ))}
                  {seatsForRender.map((seat) => (
                    <SeatComponent
                      key={seat.id}
                      seat={seat}
                      isSelected={selectedIds.has(seat.id)}
                      onToggleSelect={toggleSeatSelection}
                      onFocusSeat={handleSeatFocus}
                      heatmapByPrice={heatmapByPrice}
                    />
                  ))}
                </g>
              </svg>
            </div>
            <div className="legend">
              <span className="legend-item legend-available">Available</span>
              <span className="legend-item legend-reserved">Reserved</span>
              <span className="legend-item legend-sold">Sold</span>
              <span className="legend-item legend-held">Held</span>
              <span className="legend-item legend-selected">Selected</span>
            </div>
            {focusedSeat && (
              <div className="focused-seat" aria-live="polite">
                <strong>Focused seat:</strong> {focusedSeat.section} / Row {focusedSeat.row} / Seat{" "}
                {focusedSeat.seatNumber} ({focusedSeat.priceTier}, {focusedSeat.status})
              </div>
            )}
          </div>

          <SummaryPanel selectedSeats={selectedSeats} onClearSelection={handleClearSelection} />
        </section>
      </main>
      {toast && (
        <div className="toast-container" aria-live="polite" aria-atomic="true">
          <div className={`toast ${toast.type === "error" ? "toast-error" : "toast-info"}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};


