export interface QuickPlace {
  name: string;
  lat: number;
  lng: number;
  capital?: boolean;
  /** Put the globe label on the left of the dot (crowded coasts). */
  left?: boolean;
}

/** India first: the cities lit on the globe and offered as one-tap chips. */
export const INDIA_CITIES: QuickPlace[] = [
  { name: 'New Delhi', lat: 28.61, lng: 77.21, capital: true },
  { name: 'Mumbai', lat: 19.07, lng: 72.88, left: true },
  { name: 'Bengaluru', lat: 12.97, lng: 77.59, left: true },
  { name: 'Kolkata', lat: 22.57, lng: 88.36 },
  { name: 'Chennai', lat: 13.08, lng: 80.27 },
  { name: 'Hyderabad', lat: 17.39, lng: 78.49 },
  { name: 'Ahmedabad', lat: 23.02, lng: 72.57 },
  { name: 'Pune', lat: 18.52, lng: 73.86 },
  { name: 'Jaipur', lat: 26.91, lng: 75.79 },
  { name: 'Lucknow', lat: 26.85, lng: 80.95 },
  { name: 'Goa', lat: 15.5, lng: 73.83 },
  { name: 'Kochi', lat: 9.93, lng: 76.27 },
  { name: 'Guwahati', lat: 26.14, lng: 91.74 },
  { name: 'Srinagar', lat: 34.08, lng: 74.8 },
  { name: 'Leh', lat: 34.15, lng: 77.58 },
  { name: 'Shimla', lat: 31.1, lng: 77.17 },
  { name: 'Varanasi', lat: 25.32, lng: 82.97 },
  { name: 'Port Blair', lat: 11.62, lng: 92.73 },
];

/** A few international pours for contrast. */
export const WORLD_PLACES: QuickPlace[] = [
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'New York', lat: 40.71, lng: -74.01 },
  { name: 'Tokyo', lat: 35.68, lng: 139.65 },
  { name: 'Reykjavík', lat: 64.13, lng: -21.9 },
];
