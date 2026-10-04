"use client";

import { useLocalStorageValue } from "@/lib/use-local-storage";

export type SoundName = "acerto" | "erro" | "concluido";

export const SOUND_KEY = "ee-sons";

let context: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

function soundsOff() {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "off";
  } catch {
    return false;
  }
}

function load(name: SoundName) {
  let buffer = buffers.get(name);
  if (!buffer && context) {
    const ctx = context;
    buffer = fetch(`/sons/${name}.mp3`)
      .then((response) => response.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, buffer);
  }
  return buffer ?? Promise.resolve(null);
}

/**
 * Libera o áudio dentro de um clique (exigência do Safari/iOS) e baixa os efeitos.
 * Chame em handlers de clique antes de qualquer await.
 */
export function primeSounds() {
  if (typeof window === "undefined" || soundsOff()) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    for (const name of ["acerto", "erro", "concluido"] as const) void load(name);
  } catch {
    // Navegador sem Web Audio: segue sem som.
  }
}

export async function playSound(name: SoundName) {
  if (typeof window === "undefined" || soundsOff()) return;
  primeSounds();
  const buffer = await load(name);
  if (!context || !buffer) return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = 0.6;
  source.buffer = buffer;
  source.connect(gain).connect(context.destination);
  source.start();
}

export function useSoundsEnabled() {
  const [value, setValue] = useLocalStorageValue(SOUND_KEY);
  return [value !== "off", (enabled: boolean) => setValue(enabled ? null : "off")] as const;
}
