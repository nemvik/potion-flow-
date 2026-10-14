let context: AudioContext | undefined;
export function sound(
  kind: "select" | "pour" | "win" | "invalid",
  enabled: boolean,
): void {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
    const ac = context,
      frequencies =
        kind === "win"
          ? [523, 659, 784]
          : kind === "pour"
            ? [520, 620]
            : kind === "invalid"
              ? [180]
              : [660];
    frequencies.forEach((f, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain(),
        t = ac.currentTime + i * 0.08;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.035, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.18);
    });
  } catch {
    /* Sound is optional; unavailable audio must never stop play. */
  }
}
