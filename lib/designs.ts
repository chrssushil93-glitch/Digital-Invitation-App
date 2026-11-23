export type Motif = "lotus" | "arch" | "sun" | "moon";
export type Scene = "portico" | "garden";
export type Design = { n: string; c: string; p: number; a: string; b: string; m: Motif; s?: Scene };
export type Lang = "en" | "hi" | "mr";

export const designs: Design[] = [
  { n: "Royal Portico", c: "wedding", p: 499, a: "#fbf1e3", b: "#5a1022", m: "arch", s: "portico" },
  { n: "Garden Dance", c: "wedding", p: 499, a: "#fbf1e3", b: "#5a1022", m: "lotus", s: "garden" },
  { n: "Lotus Court", c: "engagement", p: 99, a: "#6b1428", b: "#e9d3a0", m: "lotus" },
  { n: "Peacock Night", c: "wedding", p: 399, a: "#0f4c4a", b: "#d9ac55", m: "arch" },
  { n: "Marigold Morning", c: "wedding", p: 399, a: "#c9791b", b: "#fff0c9", m: "sun" },
  { n: "Rose Terrace", c: "engagement", p: 99, a: "#a8475a", b: "#fbe3e3", m: "lotus" },
  { n: "Jharokha", c: "wedding", p: 399, a: "#7a2e17", b: "#f2d7b0", m: "arch" },
  { n: "First Candle", c: "birthday", p: 199, a: "#2f3e8f", b: "#ffe9a8", m: "sun" },
  { n: "Little Moon", c: "baby", p: 199, a: "#3b6e82", b: "#f3e7d3", m: "moon" },
  { n: "Naya Ghar", c: "home", p: 199, a: "#2f6b4a", b: "#f6e6bf", m: "arch" },
  { n: "Satyanarayan Katha", c: "puja", p: 149, a: "#b8531b", b: "#fff1d6", m: "sun" },
  { n: "Golden Fifty", c: "birthday", p: 199, a: "#1d1a14", b: "#d9ac55", m: "moon" },
  { n: "Sapphire Sangeet", c: "wedding", p: 399, a: "#1e3a8a", b: "#e5d4a1", m: "lotus" },
  { n: "Tulsi Courtyard", c: "home", p: 199, a: "#456a2e", b: "#efe7c6", m: "lotus" },
];

export const cats: { id: string; en: string; hi: string; mr: string }[] = [
  { id: "wedding", en: "Wedding", hi: "विवाह", mr: "विवाह" },
  { id: "engagement", en: "Engagement", hi: "सगाई", mr: "साखरपुडा" },
  { id: "birthday", en: "Birthday", hi: "जन्मदिन", mr: "वाढदिवस" },
  { id: "baby", en: "Baby shower", hi: "गोद भराई", mr: "डोहाळे जेवण" },
  { id: "home", en: "Housewarming", hi: "गृह प्रवेश", mr: "गृहप्रवेश" },
  { id: "puja", en: "Pooja", hi: "पूजा", mr: "पूजा" },
];

export function catLabel(id: string, lang: Lang = "en"): string {
  const c = cats.find((x) => x.id === id);
  return c ? c[lang] : "";
}

export function designBy(name: string): Design {
  return designs.find((d) => d.n === name) ?? designs[0];
}

/** SVG artwork for a design. Only constants from this file reach the markup. */
export function artSvg(d: Design, opts: { noName?: boolean; crop?: boolean } = {}): string {
  if (d.s) {
    return `<svg viewBox="0 0 300 400" role="img" aria-label="${d.n}" xmlns="http://www.w3.org/2000/svg"><image href="/scenes/${d.s}/thumb.webp" width="300" height="400" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }
  let motif = "";
  if (d.m === "lotus") {
    motif =
      `<g transform="translate(150 150)" fill="none" stroke="${d.b}" stroke-width="2">` +
      [0, -35, 35, -70, 70].map((r) => `<ellipse cx="0" cy="-34" rx="14" ry="34" transform="rotate(${r})"/>`).join("") +
      `</g>`;
  }
  if (d.m === "arch") {
    motif =
      `<path d="M70 250V150a80 80 0 0 1 160 0v100z" fill="none" stroke="${d.b}" stroke-width="2.5"/>` +
      `<path d="M90 250V155a60 60 0 0 1 120 0v95z" fill="none" stroke="${d.b}" stroke-width="1.5" opacity=".7"/>` +
      `<circle cx="150" cy="120" r="10" fill="${d.b}"/>`;
  }
  if (d.m === "sun") {
    motif =
      `<circle cx="150" cy="150" r="32" fill="${d.b}"/>` +
      Array.from({ length: 16 })
        .map((_, i) => `<line x1="150" y1="98" x2="150" y2="84" stroke="${d.b}" stroke-width="3" transform="rotate(${i * 22.5} 150 150)"/>`)
        .join("");
  }
  if (d.m === "moon") {
    motif =
      `<circle cx="150" cy="150" r="42" fill="${d.b}"/><circle cx="168" cy="140" r="38" fill="${d.a}"/>` +
      `<circle cx="90" cy="100" r="2" fill="${d.b}"/><circle cx="215" cy="95" r="2.5" fill="${d.b}"/><circle cx="205" cy="215" r="2" fill="${d.b}"/>`;
  }
  const label = opts.noName
    ? ""
    : `<text x="150" y="310" text-anchor="middle" font-family="Rozha One,Georgia,serif" font-size="24" fill="${d.b}">${d.n}</text>` +
      `<line x1="110" y1="330" x2="190" y2="330" stroke="${d.b}" stroke-width="1.2"/>`;
  const viewBox = opts.crop ? "20 40 260 230" : "0 0 300 400";
  return (
    `<svg viewBox="${viewBox}" role="img" aria-label="${d.n}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="300" height="400" fill="${d.a}"/>` +
    `<rect x="14" y="14" width="272" height="372" rx="6" fill="none" stroke="${d.b}" stroke-width="1.5" opacity=".8"/>` +
    motif +
    label +
    `</svg>`
  );
}
