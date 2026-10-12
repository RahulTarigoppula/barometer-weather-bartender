import { parseMenu } from '../engine/menu';
import type { Drink, Grammar } from '../engine/types';
import voice from '../wit/grammar/voice.json';
import raw from './bar-menu.json';

export const DRINKS: Drink[] = parseMenu(raw);
export const GRAMMAR: Grammar = voice;
export const drinkById = (id: string): Drink | undefined => DRINKS.find((d) => d.id === id);
