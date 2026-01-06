import { useEffect, useRef } from "react";
import { SeatStatus } from "../types";

export interface SeatStatusUpdate {
  seatId: string;
  status: SeatStatus;
}

export interface UseWebSocketOptions {
  enabled?: boolean;
  onUpdate: (update: SeatStatusUpdate) => void;
}

/**
 * Mock WebSocket hook that simulates live seat status updates.
 * In production, this would connect to a real WebSocket server.
 */
export const useWebSocket = ({ enabled = true, onUpdate }: UseWebSocketOptions) => {
  const intervalRef = useRef<number | null>(null);
  const seatIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Simulate WebSocket connection
    // In production, this would be: const ws = new WebSocket('ws://api.example.com/seats');
    
    // Mock: Simulate periodic seat status updates
    const simulateUpdates = () => {
      if (seatIdsRef.current.length === 0) return;

      // Randomly pick a seat and change its status
      const randomSeatId = seatIdsRef.current[Math.floor(Math.random() * seatIdsRef.current.length)];
      const statuses: SeatStatus[] = ["available", "reserved", "sold", "held"];
      const currentStatus = statuses[Math.floor(Math.random() * statuses.length)];

      onUpdate({
        seatId: randomSeatId,
        status: currentStatus
      });
    };

    // Update every 3-5 seconds (simulating real-time updates)
    intervalRef.current = window.setInterval(simulateUpdates, 3000 + Math.random() * 2000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [enabled, onUpdate]);

  const setSeatIds = (ids: string[]) => {
    seatIdsRef.current = ids;
  };

  return { setSeatIds };
};

