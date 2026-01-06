import React, { useMemo } from "react";
import { Seat } from "../types";

export interface SummaryPanelProps {
  selectedSeats: Seat[];
  onClearSelection: () => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ selectedSeats, onClearSelection }) => {
  const { subtotal, processingFee, total } = useMemo(() => {
    const total = selectedSeats.reduce((sum, seat) => {
      return sum + (seat.price ?? 0);
    }, 0);
    const fee = 0; // could be dynamic in a real system
    return { subtotal: total, processingFee: fee, total: total + fee };
  }, [selectedSeats]);

  return (
    <aside className="summary-panel" aria-label="Selected seats summary">
      <h2>Selected Seats ({selectedSeats.length}/8)</h2>
      {selectedSeats.length === 0 ? (
        <p className="summary-empty">No seats selected yet.</p>
      ) : (
        <ul className="summary-list">
          {selectedSeats.map((seat) => {
            return (
              <li key={seat.id}>
                <div className="seat-label">
                  {seat.section} / Row {seat.row} / Seat {seat.seatNumber}
                </div>
                <div className="seat-meta">
                  <span>Tier: {seat.priceTier}</span>
                  <span>${(seat.price ?? 0).toFixed(2)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="summary-lines" aria-live="polite">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Processing Fee</span>
          <span>${processingFee.toFixed(2)}</span>
        </div>
        <div className="summary-row summary-row-total">
          <span>Total</span>
          <span className="summary-total-amount">${total.toFixed(2)}</span>
        </div>
      </div>
      <div className="summary-actions">
        <button type="button" className="btn-primary" disabled={selectedSeats.length === 0}>
          Proceed to Checkout
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClearSelection}
          disabled={selectedSeats.length === 0}
        >
          Clear Selection
        </button>
      </div>
    </aside>
  );
};


