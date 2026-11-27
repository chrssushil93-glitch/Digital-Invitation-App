/**
 * Small, dependency-free charts for the admin overview (server-rendered HTML/CSS).
 * One series per chart, so no legend: the title names it. Thin columns from one baseline,
 * hairline grid, the peak labelled on its cap, a tooltip on hover and keyboard focus,
 * and a table view underneath so no value depends on hovering.
 */

type Point = { key: string; label: string; value: number };

function niceStep(max: number, ticks = 4): number {
  if (max <= 0) return 1;
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return Math.max(1, nice * mag);
}

export function ColumnChart({
  title, sub, data, format, axisFormat,
}: {
  title: string; sub?: string; data: Point[]; format: (n: number) => string; axisFormat?: (n: number) => string;
}) {
  const peak = Math.max(0, ...data.map((d) => d.value));
  const step = niceStep(peak);
  const top = Math.max(step, Math.ceil(peak / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top + 1e-9; t += step) ticks.push(t);
  const peakIdx = peak > 0 ? data.findIndex((d) => d.value === peak) : -1;
  const ax = axisFormat ?? format;
  const mid = Math.floor((data.length - 1) / 2);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <figure className="chart panel">
      <figcaption className="charthead">
        <span className="charttitle">{title}</span>
        {sub && <span className="note">{sub}</span>}
      </figcaption>
      <div className="chartplot">
        <div className="chartgrid" aria-hidden="true">
          {ticks.map((t) => (
            <div key={t} className="gridline" style={{ bottom: `${(t / top) * 100}%` }}><span>{ax(t)}</span></div>
          ))}
        </div>
        <div className="chartcols">
          {data.map((d, i) => {
            const h = top ? (d.value / top) * 100 : 0;
            const edge = i < 3 ? " tip-l" : i > data.length - 4 ? " tip-r" : "";
            return (
              <div key={d.key} className={`col${edge}`} tabIndex={0} role="img" aria-label={`${d.label}: ${format(d.value)}`}>
                <i style={{ height: `${h}%` }} />
                {i === peakIdx && <span className="cap" style={{ bottom: `${h}%` }}>{format(d.value)}</span>}
                <span className="tip" aria-hidden="true"><b>{format(d.value)}</b><span>{d.label}</span></span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="chartx" aria-hidden="true">
        <span>{data[0]?.label}</span>
        <span>{data[mid]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <details className="charttable">
        <summary>Show as a table</summary>
        <table className="rtable compact">
          <thead><tr><th>Day</th><th className="num">{title}</th></tr></thead>
          <tbody>
            {data.map((d) => <tr key={d.key}><td>{d.label}</td><td className="num">{format(d.value)}</td></tr>)}
            <tr className="totalrow"><td>Total</td><td className="num">{format(total)}</td></tr>
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars, value at the tip. */
export function RankBars({
  title, sub, rows, format, empty,
}: {
  title: string; sub?: string; rows: { label: string; value: number; note?: string }[]; format: (n: number) => string; empty: string;
}) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <figure className="chart panel">
      <figcaption className="charthead">
        <span className="charttitle">{title}</span>
        {sub && <span className="note">{sub}</span>}
      </figcaption>
      {rows.length === 0 ? (
        <p className="empty-inline">{empty}</p>
      ) : (
        <ol className="ranks">
          {rows.map((r) => (
            <li key={r.label} className="rank" tabIndex={0} aria-label={`${r.label}: ${format(r.value)}${r.note ? `, ${r.note}` : ""}`}>
              <span className="ranklabel">{r.label}{r.note && <small>{r.note}</small>}</span>
              <span className="rankbar" aria-hidden="true">
                <i style={{ width: max ? `${Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100)}%` : "0%" }} />
                <b>{format(r.value)}</b>
              </span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

/** A labelled number. Proportional figures in the body face, per the stat-tile contract. */
export function Tile({ label, value, sub, to }: { label: string; value: string; sub?: string; to?: string }) {
  const body = (
    <>
      <span className="statlabel">{label}</span>
      <span className="statvalue">{value}</span>
      {sub && <span className="note">{sub}</span>}
    </>
  );
  return to ? <a className="tile panel" href={to}>{body}</a> : <div className="tile panel">{body}</div>;
}
