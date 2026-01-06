export type SeatStatus = "available" | "reserved" | "sold" | "held";

export interface Seat {
  id: string;
  section: string;
  row: string;
  seatNumber: string;
  x: number;
  y: number;
  priceTier: string;
  price: number;
  status: SeatStatus;
}

export interface VenueMap {
  width: number;
  height: number;
  seats: Seat[];
}

export interface RawSeat {
  id: string;
  col: number;
  x: number;
  y: number;
  priceTier: string;
  price: number;
  status: SeatStatus;
}

export interface RawRow {
  index: string | number;
  scale?: number;
  seats: RawSeat[];
}

export interface RawSectionTransform {
  x: number;
  y: number;
  rows?: RawRow[];
}

export interface RawSection {
  id: string;
  label: string;
  transform: RawSectionTransform;
  rows?: RawRow[];
}

export interface RawVenueMap {
  width: number;
  height: number;
}

export interface RawVenue {
  venueId: string;
  name: string;
  map: RawVenueMap;
  sections: RawSection[];
}


