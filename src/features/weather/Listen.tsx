import { Pause, Volume2 } from 'lucide-react';
import { type ReactElement, useEffect, useState } from 'react';

/** Today's mahaul, read aloud like an audiobook, by the browser's own voice (offline, no service). */
export function Listen({ text }: { text: string }): ReactElement | null {
  const [speaking, setSpeaking] = useState(false);
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new text (a new place) must stop the old reading
  useEffect(() => {
    // A new place mid-sentence: stop the old reading.
    if (can) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [text, can]);
  useEffect(() => () => (can ? window.speechSynthesis.cancel() : undefined), [can]);
  if (!can) return null;
  const toggle = (): void => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang === 'en-IN') ?? voices.find((v) => v.lang.startsWith('en'));
    if (voice) u.voice = voice;
    u.rate = 0.98;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };
  return (
    <button type="button" className="mahaul__listen" aria-pressed={speaking} onClick={toggle}>
      {speaking ? <Pause size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
