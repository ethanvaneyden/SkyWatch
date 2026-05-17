export interface Flight {
  flight_id: number;
  flight_number: string;
  origin_airport_id: number;
  destination_airport_id: number;
  origin_code: string;
  destination_code: string;
  status: 'Scheduled' | 'Boarding' | 'In Flight' | 'Landed';
  flight_duration_hours: number;
  current_latitude?: number;
  current_longitude?: number;
  progress?: number;
}

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}
