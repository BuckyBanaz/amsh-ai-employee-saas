/**
 * Notices the caller talking over the AI without using speech recognition.
 *
 * Browser speech recognition cannot cancel the AI's own voice out of the microphone, so it transcribed the AI as if the
 * caller had spoken. This opens a separate microphone stream with the browser's echo cancellation ON and only measures
 * loudness: the AI's voice is mostly cancelled from that stream, so a sustained loud sound means a person is talking.
 * While the AI speaks, the first half second sets the echo-residue baseline; the threshold is well above it.
 */
export class BargeInDetector {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private armedAt = 0;
  private baseline = 0;
  private loudSamples = 0;
  private onBarge: (() => void) | null = null;

  static readonly MIN_LEVEL = 0.05; // RMS (0..1): quiet rooms and echo residue stay below this
  static readonly BASELINE_MS = 600; // after arming, learn the echo residue for this long
  static readonly SUSTAIN_SAMPLES = 6; // 6 x 50 ms of continuous loudness = about 300 ms of speech

  get isOpen(): boolean {
    return !!this.stream;
  }

  get isArmed(): boolean {
    return !!this.onBarge;
  }

  /** Opens the microphone (echo cancellation on). Resolves false, never throws, when that is impossible. */
  async open(): Promise<boolean> {
    if (this.isOpen) return true;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx || !navigator.mediaDevices?.getUserMedia) return false;
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      this.ctx = new Ctx();
      if (this.ctx!.state === 'suspended') await this.ctx!.resume();
      this.analyser = this.ctx!.createAnalyser();
      this.analyser.fftSize = 1024;
      this.ctx!.createMediaStreamSource(this.stream).connect(this.analyser); // not connected to the speakers
      this.timer = setInterval(() => this.tick(), 50);
      return true;
    } catch (err) {
      console.warn('[BARGE-IN] Could not open the microphone for interruption detection:', err);
      this.close();
      return false;
    }
  }

  /** Start watching while the AI speaks. Calling it again while armed keeps the learned baseline (sentence hand-off). */
  arm(onBarge: () => void): void {
    this.onBarge = onBarge;
    if (this.armedAt === 0) {
      this.armedAt = Date.now();
      this.baseline = 0;
      this.loudSamples = 0;
    }
  }

  /** Stop watching (the AI finished, or the caller already took over). */
  disarm(): void {
    this.onBarge = null;
    this.armedAt = 0;
    this.loudSamples = 0;
  }

  close(): void {
    this.disarm();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.ctx = null;
    this.analyser = null;
  }

  private level(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  private tick(): void {
    if (!this.onBarge || !this.armedAt) return;
    const level = this.level();
    if (Date.now() - this.armedAt < BargeInDetector.BASELINE_MS) {
      this.baseline = Math.max(this.baseline, level); // echo residue while the AI starts talking
      return;
    }
    const threshold = Math.max(BargeInDetector.MIN_LEVEL, this.baseline * 3);
    this.loudSamples = level > threshold ? this.loudSamples + 1 : 0;
    if (this.loudSamples >= BargeInDetector.SUSTAIN_SAMPLES) {
      const fire = this.onBarge;
      this.disarm();
      fire?.();
    }
  }
}
