"use client";
import { useEffect, useRef, useState } from "react";

/** Plays the invitation music when the door opens (a tap counts as permission). The button mutes or resumes it. */
export default function MusicPlayer({ src, on, off }: { src: string; on: string; off: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.6;
    ref.current = a;
    const start = () => { a.play().then(() => setPlaying(true)).catch(() => {}); };
    window.addEventListener("nm-open", start);
    return () => { window.removeEventListener("nm-open", start); a.pause(); ref.current = null; };
  }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  return (
    <button type="button" className="music" onClick={toggle} aria-pressed={playing} aria-label={playing ? off : on}>
      {playing ? "♪" : "♪̸"}
    </button>
  );
}
