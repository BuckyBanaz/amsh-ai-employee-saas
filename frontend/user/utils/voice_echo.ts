/**
 * Decides whether something the microphone heard is really the AI's own voice coming back through the speakers.
 *
 * The old check compared every caller sentence with the AI's last five replies and threw the caller away on a modest word
 * overlap. A caller answering "dental cleaning" to "Would you like dental cleaning or whitening?" was therefore discarded
 * as an echo and never heard. Two rules fix that: only judge audio that arrives while the AI is speaking or just after
 * (`echoWindow`), and only call it an echo when most of a longer phrase, or a whole multi-word phrase, is the AI's own words.
 */

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'।]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function isEchoOfAI(heard: string, recentAiTexts: string[], echoWindow: boolean): boolean {
  if (!echoWindow) return false; // long after the AI stopped: whatever we hear is the caller
  const user = clean(heard);
  if (!user) return true;
  const words = user.split(' ');
  for (const ai of recentAiTexts) {
    const spoken = clean(ai);
    if (!spoken) continue;
    if (words.length >= 3 && spoken.includes(user)) return true; // a slice of what the AI just said
    const aiWords = new Set(spoken.split(' '));
    const hits = words.filter((w) => aiWords.has(w)).length;
    if (words.length >= 4 && hits / words.length >= 0.7) return true;
    if (words.length >= 2 && words.length < 4 && hits === words.length && user.length >= 8) return true;
  }
  return false;
}

/**
 * While the AI is speaking, is what the microphone heard a genuine interruption by the caller?
 * The AI's own voice comes back through the speakers and gets transcribed as (nearly) the words it is saying, so a real
 * interruption needs at least three words of which fewer than half appear in the AI's recent replies.
 */
export function isRealInterruption(heard: string, recentAiTexts: string[]): boolean {
  const words = clean(heard).split(' ').filter((w) => w.length >= 2);
  if (words.length < 3) return false;
  const aiWords = new Set(recentAiTexts.flatMap((t) => clean(t).split(' ')));
  const hits = words.filter((w) => aiWords.has(w)).length;
  return hits / words.length < 0.5;
}
