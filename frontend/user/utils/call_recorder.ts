/**
 * Records a browser test call: the caller's microphone plus the AI's voice, mixed into one track, so the call can be
 * played back in /calls. The AI's audio has to pass through the Web Audio graph to be captured, so callers hand each
 * AI audio element to `tapAiAudio` (the Web Speech fallback voice cannot be captured and is simply not recorded).
 */
export class CallRecorder {
  private ctx: AudioContext | null = null;
  private mixed: MediaStreamAudioDestinationNode | null = null;
  private micStream: MediaStream | null = null;
  private micGain: GainNode | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  static supported(): boolean {
    return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  get active(): boolean {
    return !!this.recorder && this.recorder.state !== 'inactive';
  }

  /** Resolves false (never throws) when recording is impossible, e.g. the microphone was refused. */
  async start(): Promise<boolean> {
    if (this.active || !CallRecorder.supported()) return this.active;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      if (this.ctx!.state === 'suspended') await this.ctx!.resume();
      this.mixed = this.ctx!.createMediaStreamDestination();
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.micGain = this.ctx!.createGain();
      this.ctx!.createMediaStreamSource(this.micStream).connect(this.micGain);
      this.micGain.connect(this.mixed);
      this.chunks = [];
      this.recorder = new MediaRecorder(this.mixed.stream);
      this.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.start(1000);
      this.startedAt = Date.now();
      return true;
    } catch (err) {
      console.warn('[RECORDER] Could not start call recording:', err);
      this.release();
      return false;
    }
  }

  /**
   * Route an AI audio element through the recorder (and on to the speakers). Must be called before the element plays,
   * and only once per element. The caller's mic is silenced in the recording while the AI talks, so speaker echo
   * does not double the AI's voice.
   */
  tapAiAudio(audio: HTMLAudioElement): boolean {
    if (!this.active || !this.ctx || !this.mixed) return false;
    try {
      const source = this.ctx.createMediaElementSource(audio);
      source.connect(this.mixed);
      source.connect(this.ctx.destination);
      const duck = (on: boolean) => { if (this.micGain) this.micGain.gain.value = on ? 0 : 1; };
      audio.addEventListener('play', () => duck(true));
      for (const ev of ['ended', 'pause', 'error']) audio.addEventListener(ev, () => duck(false));
      return true;
    } catch (err) {
      console.warn('[RECORDER] Could not capture AI audio:', err);
      return false;
    }
  }

  /** Stops recording and resolves the finished file (null if nothing usable was captured). */
  async stop(): Promise<Blob | null> {
    const rec = this.recorder;
    if (!rec) return null;
    const type = rec.mimeType || 'audio/webm';
    const stopped = new Promise<void>((resolve) => {
      if (rec.state === 'inactive') return resolve();
      rec.onstop = () => resolve();
    });
    try { if (rec.state !== 'inactive') rec.stop(); } catch { /* already stopped */ }
    await stopped;
    const blob = this.chunks.length && Date.now() - this.startedAt > 1000 ? new Blob(this.chunks, { type }) : null;
    this.release();
    return blob;
  }

  /** Drop everything without producing a file (unmount, failed start). */
  discard(): void {
    try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch { /* ignore */ }
    this.release();
  }

  private release(): void {
    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.ctx = null;
    this.mixed = null;
    this.micGain = null;
    this.recorder = null;
    this.chunks = [];
  }
}
