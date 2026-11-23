/** Credits required by the CC BY 4.0 licenses of the 3D models. */
const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer">{children}</a>
);
export default function DoorCredit() {
  const by = <L href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</L>;
  return (
    <p className="credit">
      3D models: “<L href="https://sketchfab.com/3d-models/old-wooden-door-1cec090cd02142b094802d242e03ee7c">Old wooden Door</L>” by{" "}
      <L href="https://sketchfab.com/Ellie3D">Ellie3D</L>; “700511 Classic Osgona chandelier” by LIGHTSTAR GROUP — all on Sketchfab, licensed {by}.
    </p>
  );
}
