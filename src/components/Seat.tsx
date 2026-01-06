import React, { KeyboardEvent } from "react";
import { Seat as SeatType, SeatStatus } from "../types";

const STATUS_COLORS: Record<SeatStatus, string> = {
  available: "#10b981", // green
  reserved: "#fbbf24", // amber
  sold: "#b91c1c", // red
  held: "#0284c7" // blue
};

const PRICE_COLORS: Record<string, string> = {
  premium: "#22c55e",
  standard: "#3b82f6",
  economy: "#eab308"
};

export interface SeatProps {
  seat: SeatType;
  isSelected: boolean;
  onToggleSelect: (seatId: string) => void;
  onFocusSeat?: (seat: SeatType) => void;
  heatmapByPrice?: boolean;
}

const SEAT_SIZE = 36;

const SeatComponent: React.FC<SeatProps> = ({
  seat,
  isSelected,
  onToggleSelect,
  onFocusSeat,
  heatmapByPrice
}) => {
  const handleClick = () => {
    onToggleSelect(seat.id);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleSelect(seat.id);
    }
  };

  const baseColor = heatmapByPrice
    ? PRICE_COLORS[seat.priceTier.toLowerCase()] ?? "#6b7280"
    : STATUS_COLORS[seat.status];
  const fillColor = isSelected ? "#004085" : baseColor;
  const strokeColor = isSelected ? "#ffffff" : "#222222";
  const strokeWidth = isSelected ? 2 : 1;
  const isAvailable = seat.status === "available";

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Seat ${seat.seatNumber}, Row ${seat.row}, Section ${seat.section}, ${seat.status}`}
      transform={`translate(${seat.x}, ${seat.y})`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        if (onFocusSeat) {
          onFocusSeat(seat);
        }
      }}
      style={{ cursor: isAvailable ? "pointer" : "not-allowed", opacity: isAvailable ? 1 : 0.85 }}
      data-seat-title={
        isAvailable
          ? `Seat ${seat.seatNumber} (available)`
          : `Seat ${seat.seatNumber} is ${seat.status} and cannot be selected`
      }
    >
      <rect
        x={-SEAT_SIZE / 2}
        y={-SEAT_SIZE / 2}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        rx={12}
        ry={12}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      <text
        x={0}
        y={4}
        textAnchor="middle"
        fontSize="14"
        fontWeight="600"
        fill="#ecfeff"
        pointerEvents="none"
      >
        {seat.seatNumber}
      </text>
    </g>
  );
};

export const Seat = React.memo(SeatComponent);


