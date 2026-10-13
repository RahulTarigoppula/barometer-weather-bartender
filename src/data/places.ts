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

/** "Surprise me": places whose weather is a story of its own, India first. */
export interface Surprise {
  name: string;
  lat: number;
  lng: number;
  fact: string;
}
export const SURPRISES: Surprise[] = [
  {
    name: 'Mawsynram',
    lat: 25.3,
    lng: 91.58,
    fact: 'Among the wettest places on Earth: over 11 metres of rain a year.',
  },
  { name: 'Cherrapunji', lat: 25.27, lng: 91.73, fact: 'Once logged 26 metres of rain in a single year.' },
  { name: 'Leh', lat: 34.15, lng: 77.58, fact: 'A cold desert at 3,500 m, with one of the clearest skies in India.' },
  { name: 'Jaisalmer', lat: 26.92, lng: 70.9, fact: 'The golden city of the Thar, where summer nights still burn.' },
  {
    name: 'Munnar',
    lat: 10.09,
    lng: 77.06,
    fact: 'Tea hills where Neelakurinji turns the slopes blue every twelve years.',
  },
  { name: 'Darjeeling', lat: 27.04, lng: 88.26, fact: 'Mist, tea and a sunrise over Kanchenjunga.' },
  {
    name: 'Dras',
    lat: 34.43,
    lng: 75.75,
    fact: 'One of the coldest inhabited places in the world: below −40° in winter.',
  },
  { name: 'Phalodi', lat: 27.13, lng: 72.36, fact: 'Hit 51 °C in May 2016, an Indian record.' },
  { name: 'Port Blair', lat: 11.62, lng: 92.73, fact: 'Where the monsoon first knocks on India’s door.' },
  { name: 'Shillong', lat: 25.58, lng: 91.89, fact: 'The Scotland of the East: pine, rain and rock music.' },
  { name: 'Kutch', lat: 23.73, lng: 69.86, fact: 'A white salt desert that floods into a sea every monsoon.' },
  { name: 'Spiti', lat: 32.25, lng: 78.03, fact: 'A high-altitude desert valley between India and Tibet.' },
  { name: 'Death Valley', lat: 36.46, lng: -116.87, fact: 'The hottest air temperature ever measured: 56.7 °C.' },
  { name: 'Oymyakon', lat: 63.46, lng: 142.79, fact: 'The coldest permanently inhabited village: −67.7 °C.' },
  { name: 'Atacama', lat: -24.5, lng: -69.25, fact: 'The driest non-polar desert on Earth.' },
  { name: 'Antarctica', lat: -80, lng: 30, fact: 'The coldest, windiest, driest continent.' },
  { name: 'Tromsø', lat: 69.65, lng: 18.96, fact: 'Two months of night, and the northern lights overhead.' },
  { name: 'Singapore', lat: 1.35, lng: 103.82, fact: 'Thunderstorms on roughly 170 days a year.' },
  { name: 'Reykjavík', lat: 64.13, lng: -21.9, fact: 'Four seasons in an afternoon.' },
  { name: 'Sahara', lat: 23.4, lng: 13.6, fact: 'Larger than India, with sand dunes taller than towers.' },
];

/** A surprise that is not the place you are already looking at. */
export function pickSurprise(rand: number, near?: { lat: number; lng: number }): Surprise {
  const pool = near ? SURPRISES.filter((s) => Math.abs(s.lat - near.lat) + Math.abs(s.lng - near.lng) > 1) : SURPRISES;
  return pool[Math.floor(rand * pool.length) % pool.length] as Surprise;
}
