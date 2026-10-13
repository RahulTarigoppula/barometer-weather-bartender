import { loadDots } from '../../api/geo';
import { play } from '../../audio/sfx';
import { DRINKS, GRAMMAR } from '../../data/menu';
import { budgetPlan } from '../../engine/budget';
import { served } from '../../engine/index';
import { haptic } from '../../platform/haptics';
import { shareFile } from '../../platform/share';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { speak } from '../../wit/speak';

/** Share: render the 1080×1350 weather-and-drink card, then share it (phones) or download it (desktop). */
export async function tearReceipt(): Promise<void> {
  const bar = useBar.getState();
  if (bar.coaster.kind !== 'verdict') return;
  const v = bar.coaster.verdict;
  const { menu, gentler, units, tier } = useSettings.getState();
  const s = served(v, DRINKS, menu, bar.opinion, gentler);
  play('zzzt');
  haptic('medium');
  try {
    const [{ cardFilename, renderShareCard }, dots] = await Promise.all([import('./shareCard'), loadDots()]);
    const lines = speak({ ...v, stamp: s.stamp }, GRAMMAR, s.drink, { units });
    const blob = await renderShareCard({
      v,
      drink: s.drink,
      stamp: s.stamp.text,
      jab: lines.jab,
      plan: budgetPlan(s.drink, tier),
      dots,
      units,
      version: __APP_VERSION__,
    });
    const outcome = await shareFile(blob, cardFilename(v), `${s.drink.name} — Mausam ka Mahaul`);
    if (outcome === 'downloaded') useBar.getState().showToast('Card saved to your device.');
  } catch {
    useBar.getState().showToast('Could not make the card. Try again.');
  }
}
