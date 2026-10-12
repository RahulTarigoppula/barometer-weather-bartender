import type { BottleId } from '../../engine/types';

export type BottleShape = 'tall' | 'square' | 'flask' | 'tin' | 'can' | 'sprig';

export interface BottleArt {
  id: BottleId;
  name: string;
  family: 'spirit' | 'barista';
  shape: BottleShape;
  h: number;
  glass: string;
  label: string;
}

/** The 12 canonical bottles, left to right on the shelf. Own SVG art (MIT with the repo). */
export const BOTTLES: BottleArt[] = [
  { id: 'rum', name: 'Dark rum', family: 'spirit', shape: 'tall', h: 92, glass: '#2A160B', label: '#C9962B' },
  { id: 'syrup', name: 'Syrups', family: 'barista', shape: 'tall', h: 86, glass: '#3B2A1A', label: '#E6D2A6' },
  { id: 'gin', name: 'Gin', family: 'spirit', shape: 'square', h: 82, glass: '#16311F', label: '#E8DCC0' },
  { id: 'whisky', name: 'Whisky', family: 'spirit', shape: 'square', h: 88, glass: '#4A2A0E', label: '#D9B98A' },
  { id: 'tequila', name: 'Tequila', family: 'spirit', shape: 'tall', h: 78, glass: '#2F3A1C', label: '#F3E6C8' },
  { id: 'vodka', name: 'Vodka', family: 'spirit', shape: 'tall', h: 84, glass: '#2A2620', label: '#C9B28C' },
  { id: 'vermouth', name: 'Vermouth', family: 'spirit', shape: 'square', h: 74, glass: '#3A2118', label: '#B8322E' },
  { id: 'bitters', name: 'Bitters', family: 'spirit', shape: 'flask', h: 62, glass: '#4A1010', label: '#F0564B' },
  { id: 'tea', name: 'Tea tin', family: 'barista', shape: 'tin', h: 66, glass: '#1E3A2A', label: '#8CC46A' },
  { id: 'cocoa', name: 'Cocoa tin', family: 'barista', shape: 'tin', h: 70, glass: '#3A2010', label: '#C9962B' },
  {
    id: 'ginger-beer',
    name: 'Ginger beer',
    family: 'barista',
    shape: 'can',
    h: 64,
    glass: '#7A4A10',
    label: '#F08A3C',
  },
  { id: 'mint', name: 'Mint', family: 'barista', shape: 'sprig', h: 58, glass: '#1E4A2A', label: '#7FE8C8' },
];

export const SHAPES: Record<BottleShape, string> = {
  tall: 'M6 100 L6 44 Q6 36 11 30 L11 12 Q11 8 14 8 L20 8 Q23 8 23 12 L23 30 Q28 36 28 44 L28 100 Z',
  square: 'M5 100 L5 40 L11 30 L11 10 L23 10 L23 30 L29 40 L29 100 Z',
  flask: 'M9 100 L9 46 Q9 40 13 34 L13 14 L11 14 L11 9 L23 9 L23 14 L21 14 L21 34 Q25 40 25 46 L25 100 Z',
  tin: 'M6 100 L6 26 L8 20 L26 20 L28 26 L28 100 Z',
  can: 'M8 100 L8 30 Q8 23 12 21 L22 21 Q26 23 26 30 L26 100 Z',
  sprig:
    'M17 100 L17 46 M17 60 Q4 54 9 38 Q22 42 17 60 Z M17 52 Q30 46 25 30 Q12 34 17 52 Z M17 40 Q8 32 13 18 Q24 24 17 40 Z',
};
