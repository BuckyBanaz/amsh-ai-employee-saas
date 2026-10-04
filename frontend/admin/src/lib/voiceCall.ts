// Live voice for the admin playground, the same way the clinic dashboard's orb talks: the reply streams in sentence by sentence,
// each sentence is spoken with the server's real text-to-speech (/voice/preview), the caller's mic is transcribed by the
// server (/voice/transcribe), and speaking over the AI interrupts it. Nothing here is a canned or browser-voice substitute
// except as a last resort when the server cannot synthesise a sentence.

import { API_BASE, ApiError, adminAuth } from '@/lib/api';

export interface StreamSentence { text: string; emotion?: string; ttsText?: string; voiceId?: string; language?: string }

const authHeaders = (): Record<string, string> => {
  const token = adminAuth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function failure(res: Response, fallback: string): Promise<ApiError> {
  const body = await res.json().catch(() => null) as { detail?: unknown } | null;
  return new ApiError(typeof body?.detail === 'string' ? body.detail : `${fallback} (${res.status})`, res.status);
}

/** One caller turn. `onSentence` fires the moment the server has each sentence; resolves with the final turn payload. */
export async function streamTurn<T>(
  body: { business_id: string; call_id: string; caller_number: string; user_transcript: string },
  onSentence: (s: StreamSentence) => void,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${API_BASE}/voice/simulate/stream`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body), signal,
  });
  if (!res.ok || !res.body) throw await failure(res, 'The AI could not answer');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final: T | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const ev = JSON.parse(line) as { type: string; text?: string; emotion?: string; tts_text?: string; voice_id?: string; language?: string };
    if (ev.type === 'sentence') onSentence({ text: ev.text ?? '', emotion: ev.emotion, ttsText: ev.tts_text, voiceId: ev.voice_id, language: ev.language ?? undefined });
    else if (ev.type === 'done') final = ev as unknown as T;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) { handle(buffer.slice(0, nl)); buffer = buffer.slice(nl + 1); }
  }
  handle(buffer);
  if (!final) throw new ApiError('The AI reply ended early. Try again.', 0);
  return final;
}

/** Speaks sentences one after another with the server's voice; the next sentence is fetched while the current one plays. */
export class VoicePlayer {
  private queue: StreamSentence[] = [];
  private fetches = new Map<StreamSentence, Promise<Blob | null>>();
  private audio: HTMLAudioElement | null = null;
  private running = false;
  private generation = 0;
  /** Called with true when speech starts, false once the queue has fully played, and triggers onFinished when complete. */
  constructor(
    private onSpeaking: (speaking: boolean) => void,
    private onError: (message: string) => void,
    private onFinished?: () => void
  ) {}

  get speaking() { return this.running; }

  private fetchAudio(s: StreamSentence): Promise<Blob | null> {
    let p = this.fetches.get(s);
    if (!p) {
      const q = new URLSearchParams({ voice_id: s.voiceId ?? '', text: (s.ttsText ?? s.text).slice(0, 250) });
      if (s.emotion) q.set('emotion', s.emotion);
      if (s.language) q.set('language', s.language);
      p = fetch(`${API_BASE}/voice/preview?${q}`, { headers: authHeaders() })
        .then(async (r) => { if (!r.ok) throw await failure(r, 'Voice unavailable'); return r.blob(); })
        .catch((e: unknown) => { this.onError(e instanceof Error ? e.message : 'Voice unavailable'); return null; });
      this.fetches.set(s, p);
    }
    return p;
  }

  enqueue(s: StreamSentence) {
    if (!s.voiceId) return;
    this.queue.push(s);
    void this.fetchAudio(s); // start synthesis now, play when its turn comes
    if (!this.running) void this.run();
  }

  private async run() {
    const gen = this.generation;
    this.running = true;
    this.onSpeaking(true);
    while (gen === this.generation && this.queue.length) {
      const s = this.queue.shift()!;
      const blob = await this.fetchAudio(s);
      this.fetches.delete(s);
      if (gen !== this.generation) continue;
      if (!blob) {
        // Fallback to browser Web Speech Synthesis if Cartesia preview endpoint fails
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          await new Promise<void>((resolve) => {
            const u = new SpeechSynthesisUtterance(s.ttsText ?? s.text);
            if (s.language) u.lang = s.language;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            window.speechSynthesis.speak(u);
          });
        }
        continue;
      }
      await new Promise<void>((resolve) => {
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        this.audio = a;
        const done = () => { URL.revokeObjectURL(url); if (this.audio === a) this.audio = null; resolve(); };
        a.onended = done; a.onerror = done;
        a.play().catch(done);
      });
    }
    if (gen === this.generation) {
      this.running = false;
      this.onSpeaking(false);
      this.onFinished?.();
    }
  }

  /** Cut the AI off now (caller interrupted, new conversation, or muted). */
  stop() {
    this.generation++;
    this.queue = [];
    this.fetches.clear();
    this.audio?.pause();
    this.audio = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.running) {
      this.running = false;
      this.onSpeaking(false);
    }
  }
}

export interface MicHandlers {
  onSpeechStart: () => void;
  /** Every utterance ends, whether or not it turned into a turn (a cough or the AI's echo is dropped). */
  onSpeechEnd?: () => void;
  onUtterance: (transcript: string) => void;
  onBargeIn: () => void;
  onError: (message: string) => void;
}

/** Hands-free microphone: detects when the caller speaks, records that utterance, has the server transcribe it, and tells the
 *  page when the caller talks over the AI. `aiSpeaking` is read live so the same mic serves both listening and interrupting. */
export class MicSession {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private loudSince = 0;
  private quietSince = 0;
  private speechStartedAt = 0;
  private interrupted = false;
  private paused = false;

  constructor(private h: MicHandlers, private aiSpeaking: () => boolean) {}

  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      this.h.onError('Microphone permission was denied. Allow the mic for this site and try again.');
      return false;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 1024;
    this.ctx.createMediaStreamSource(this.stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    this.timer = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) { const d = (v - 128) / 128; sum += d * d; }
      this.tick(Math.sqrt(sum / buf.length), Date.now());
    }, 50);
    return true;
  }

  /** Stop picking up speech (e.g. while a turn is being answered and audio is muted). */
  setPaused(paused: boolean) { this.paused = paused; }

  private tick(level: number, now: number) {
    if (this.paused) return;
    const speaking = this.aiSpeaking();
    const threshold = speaking ? 0.09 : 0.03; // over the AI's own voice the caller has to be clearly louder
    if (level > threshold) {
      this.quietSince = 0;
      if (!this.loudSince) this.loudSince = now;
      if (!this.recorder && now - this.loudSince > 120) this.begin(now);
      if (this.recorder && speaking && !this.interrupted && now - this.loudSince > 350) { this.interrupted = true; this.h.onBargeIn(); }
    } else {
      this.loudSince = 0;
      if (this.recorder) {
        if (!this.quietSince) this.quietSince = now;
        if (now - this.quietSince > 900) this.finish(now);
      }
    }
  }

  private begin(now: number) {
    if (!this.stream) return;
    this.chunks = [];
    this.interrupted = false;
    this.speechStartedAt = now;
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
    if (!this.aiSpeaking()) this.h.onSpeechStart();
  }

  private finish(now: number) {
    const rec = this.recorder;
    if (!rec) return;
    this.recorder = null;
    this.quietSince = 0;
    this.h.onSpeechEnd?.();
    const spokeFor = now - this.speechStartedAt;
    const keep = !(this.aiSpeaking() && !this.interrupted) && spokeFor > 500; // a cough, a click or the AI's echo is dropped
    rec.onstop = async () => {
      if (!keep || !this.chunks.length) return;
      const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
      try {
        const form = new FormData();
        form.append('file', blob, 'mic_recording.webm');
        const res = await fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', headers: authHeaders(), body: form });
        if (!res.ok) throw await failure(res, 'Could not transcribe the audio');
        const { transcript } = (await res.json()) as { transcript: string };
        if (transcript?.trim()) this.h.onUtterance(transcript.trim());
      } catch (e) {
        this.h.onError(e instanceof Error ? e.message : 'Could not transcribe the audio');
      }
    };
    rec.stop();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.recorder?.state === 'recording' && this.recorder.stop();
    this.recorder = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
