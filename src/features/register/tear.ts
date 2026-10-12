import { loadDots } from '../../api/geo';
import { play } from '../../audio/sfx';
import { DRINKS, GRAMMAR } from '../../data/menu';
import { served } from '../../engine/index';
import { haptic } from '../../platform/haptics';
import { shareFile } from '../../platform/share';
import { useSettings } from '../../state/settings';
import { useBar } from '../../state/store';
import { speak } from '../../wit/speak';

/** TEAR: rip the receipt along the perforation, then share or download the 1080×1350 card. */
export async function tearReceipt(): Promise<void> {
  const bar = useBar.getState();
  if (bar.coaster.kind !== 'verdict') return;
  const v = bar.coaster.verdict;
  const { menu, gentler, units } = useSettings.getState();
  const s = served(v, DRINKS, menu, bar.opinion, gentler);
  play('zzzt');
  haptic('medium');
  bar.patch({ receipt: 'torn', tornAt: v.localTime });
  try {
    const [{ cardFilename, renderShareCard }, dots] = await Promise.all([import('./shareCard'), loadDots()]);
    const lines = speak({ ...v, stamp: s.stamp }, GRAMMAR, s.drink, { units });
    const blob = await renderShareCard({
      v,
      drink: s.drink,
      stamp: s.stamp.text,
      jab: lines.jab,
      closer: lines.closer,
      dots,
      units,
      version: __APP_VERSION__,
    });
    const outcome = await shareFile(blob, cardFilename(v), `${s.drink.name} — The Globe Bar`);
    if (outcome === 'downloaded') useBar.getState().showToast('Saved to your device.');
  } catch {
    useBar.getState().showToast('The printer jammed. Try the TEAR key again.');
  }
}
