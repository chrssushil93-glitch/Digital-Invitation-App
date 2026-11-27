import Link from "next/link";

export default function InviteNotFound() {
  return (
    <main className="wrap">
      <div className="panel empty" style={{ maxWidth: 520, margin: "3rem auto" }}>
        <div className="emptyart" aria-hidden="true">✉️</div>
        <h1 className="h3">This invitation is not available</h1>
        <p className="note">
          The link may be mistyped, or the invitation has not been published yet. Please check the link with the person who sent it.
        </p>
        <div className="row center"><Link className="btn ghost small" href="/">Go to the home page</Link></div>
      </div>
    </main>
  );
}
