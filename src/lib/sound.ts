"use client";

/** Toques de notificação sintetizados via Web Audio API (sem arquivos externos). */
export type SoundTone = "sino" | "bipe" | "clique";

export const SOUND_TONE_LABELS: Record<SoundTone, string> = {
  sino: "Sino",
  bipe: "Bipe",
  clique: "Clique suave",
};

export const SOUND_TONES = Object.keys(SOUND_TONE_LABELS) as SoundTone[];

const ENTRY_KEY = "chcontrol:sound:entry";
const EXIT_KEY = "chcontrol:sound:exit";
const ENABLED_KEY = "chcontrol:sound:enabled";

function playNotes(notes: { freq: number; duration: number }[], type: OscillatorType) {
  if (typeof window === "undefined") return;
  const AudioCtxCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxCtor) return;
  const ctx = new AudioCtxCtor();
  let time = ctx.currentTime;
  for (const { freq, duration } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.28, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.03);
    time += duration;
  }
  const totalMs = (time - ctx.currentTime + 0.3) * 1000;
  setTimeout(() => ctx.close().catch(() => {}), totalMs);
}

/** Toca um dos 3 toques disponíveis para pré-visualização ou notificação real. */
export function playSoundTone(tone: SoundTone) {
  switch (tone) {
    case "sino":
      playNotes([{ freq: 880, duration: 0.16 }, { freq: 1318.5, duration: 0.38 }], "sine");
      return;
    case "bipe":
      playNotes([{ freq: 660, duration: 0.09 }, { freq: 660, duration: 0.09 }], "square");
      return;
    case "clique":
      playNotes([{ freq: 523.25, duration: 0.07 }], "triangle");
      return;
  }
}

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ENABLED_KEY) !== "off";
}

export function setSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(ENABLED_KEY, enabled ? "on" : "off");
}

export function getSoundPref(kind: "entry" | "exit"): SoundTone {
  const fallback: SoundTone = kind === "entry" ? "sino" : "bipe";
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(kind === "entry" ? ENTRY_KEY : EXIT_KEY);
  return (SOUND_TONES as string[]).includes(stored ?? "") ? (stored as SoundTone) : fallback;
}

export function setSoundPref(kind: "entry" | "exit", tone: SoundTone) {
  window.localStorage.setItem(kind === "entry" ? ENTRY_KEY : EXIT_KEY, tone);
}

/** Toca o toque configurado para entrada, se o som estiver habilitado. */
export function playEntrySound() {
  if (!getSoundEnabled()) return;
  playSoundTone(getSoundPref("entry"));
}

/** Toca o toque configurado para saída, se o som estiver habilitado. */
export function playExitSound() {
  if (!getSoundEnabled()) return;
  playSoundTone(getSoundPref("exit"));
}
