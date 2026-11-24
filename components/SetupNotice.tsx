/** Shown in the studio when the database is missing tables, columns or functions. */
export default function SetupNotice({ code }: { code?: string }) {
  return (
    <div className="panel notice" role="alert">
      <h2 className="h3">The database needs one more step</h2>
      <p>
        Your invitations cannot be loaded or saved because the database setup is incomplete
        {code ? <> (code <code>{code}</code>)</> : null}.
      </p>
      <ol className="setupsteps">
        <li>Open your Supabase project, then <b>SQL Editor → New query</b>.</li>
        <li>Paste the whole of <code>supabase/setup.sql</code> from the project and press <b>Run</b>. It is safe to run again.</li>
        <li>Open <a href="/api/health" target="_blank" rel="noreferrer">/api/health</a>: every line should say “ok”. Then refresh this page.</li>
      </ol>
    </div>
  );
}
