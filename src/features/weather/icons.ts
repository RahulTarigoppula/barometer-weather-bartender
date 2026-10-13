import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  type LucideIcon,
  Moon,
  Sun,
} from 'lucide-react';
import { wmoKind } from '../../engine/wmo';

export function iconFor(wmo: number, isDay: boolean): LucideIcon {
  switch (wmoKind(wmo)) {
    case 'clear':
      return isDay ? Sun : Moon;
    case 'cloudy':
      return wmo === 3 ? Cloud : isDay ? CloudSun : CloudMoon;
    case 'fog':
      return CloudFog;
    case 'drizzle':
    case 'freezing-drizzle':
      return CloudDrizzle;
    case 'rain':
    case 'showers':
    case 'freezing-rain':
      return CloudRain;
    case 'downpour':
      return CloudRainWind;
    case 'snow':
    case 'heavy-snow':
    case 'snow-grains':
    case 'snow-showers':
    case 'heavy-snow-showers':
      return CloudSnow;
    case 'storm':
      return CloudLightning;
    case 'hail':
      return CloudHail;
    default:
      return Cloud;
  }
}
