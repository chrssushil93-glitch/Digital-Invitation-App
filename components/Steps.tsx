const STEPS = ["Design & details", "Pay & publish", "Share with guests"];

/** Where the host is: 1 create, 2 pay, 3 share. */
export default function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "now" : "next";
        return (
          <li key={s} className={`step ${state}`} aria-current={state === "now" ? "step" : undefined}>
            <span className="stepnum" aria-hidden="true">{state === "done" ? "✓" : n}</span>
            <span className="steplabel">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
