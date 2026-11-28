import type { Metadata } from "next";
import Link from "next/link";
import { Flash } from "@/components/admin/ui";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { adminCall, requireAdmin, type CustomerRow, type Paged } from "@/lib/admin";
import { artSvg, catLabel, designs } from "@/lib/designs";
import { getSettings, logoUrl } from "@/lib/settings";
import { paymentsKeyState } from "@/lib/paymentsDb";
import { razorpayConfigured } from "@/lib/razorpay";
import { addAdminByEmail, customerRole, linkPaymentsKey, saveSettings } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin settings" };

export default async function AdminSettings({ searchParams }: { searchParams: { ok?: string; err?: string } }) {
  const me = await requireAdmin();
  const [s, admins] = await Promise.all([
    getSettings(),
    adminCall<Paged<CustomerRow>>("admin_customers", { p_filter: "admins", p_search: "", p_limit: 100, p_offset: 0 }),
  ]);
  const pk = await paymentsKeyState();
  const keysReady = razorpayConfigured() && pk === "ok";

  return (
    <>
      <div className="adminpagehead">
        <div>
          <h1 className="pagetitle">Site settings</h1>
          <p className="note">Changes go live on the site as soon as you save.</p>
        </div>
      </div>
      <Flash ok={searchParams.ok} err={searchParams.err} />

      <section className="panel" aria-labelledby="pay-h">
        <h2 className="h3" id="pay-h">Payment connection</h2>
        <ul className="checklist">
          <li className={razorpayConfigured() ? "done" : "todo"}>
            <b>Razorpay keys</b> {razorpayConfigured() ? "are set." : "are missing: add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel and redeploy."}
          </li>
          <li className={pk === "ok" ? "done" : "todo"}>
            <b>Payments key</b>{" "}
            {pk === "ok" ? "is connected." : pk === "missing" ? "is missing: add PAYMENTS_DB_SECRET (any random text, 32+ characters) in Vercel and redeploy." : pk === "setup" ? "needs the database update (supabase/setup.sql)." : "is set in Vercel but not connected yet."}
          </li>
        </ul>
        {pk === "unlinked" && (
          <form action={linkPaymentsKey}>
            <button className="btn small" type="submit">Connect payments</button>
          </form>
        )}
      </section>

      <form action={saveSettings} className="settingsform" encType="multipart/form-data">
        <section className="panel" aria-labelledby="g-h">
          <h2 className="h3" id="g-h">Brand and contact</h2>
          <div className="fgrid">
            <div className="field"><label htmlFor="siteName">Site name</label>
              <input id="siteName" name="siteName" type="text" maxLength={40} required defaultValue={s.siteName} />
              <p className="hint">Shown in the header, page titles, checkout and the guest page footer.</p></div>
            <div className="field"><label htmlFor="metaDescription">Search engine description</label>
              <input id="metaDescription" name="metaDescription" type="text" maxLength={200} defaultValue={s.metaDescription} /></div>
            <div className="field"><label htmlFor="supportEmail">Support email</label>
              <input id="supportEmail" name="supportEmail" type="email" maxLength={120} defaultValue={s.supportEmail} placeholder="help@example.com" /></div>
            <div className="field"><label htmlFor="supportPhone">Support WhatsApp number</label>
              <input id="supportPhone" name="supportPhone" type="tel" maxLength={30} defaultValue={s.supportPhone} placeholder="+91 98765 43210" />
              <p className="hint">Shown to hosts whose invitation or account needs your help.</p></div>
          </div>
          <div className="logorow">
            <div className="logoprev" aria-label="Current logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl(s)} alt="Current logo" />
            </div>
            <div className="field grow">
              <label htmlFor="logo">Logo</label>
              <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
              <p className="hint">PNG, JPG, WebP or SVG, up to 1 MB. Used in the header and as the watermark on unpaid previews.</p>
              {s.logoVersion > 0 && <label className="checkline"><input type="checkbox" name="removeLogo" /> Go back to the built-in logo</label>}
            </div>
          </div>
        </section>

        <section className="panel" aria-labelledby="h-h">
          <h2 className="h3" id="h-h">Home page and announcement</h2>
          <div className="field"><label htmlFor="heroTitle">Headline</label>
            <input id="heroTitle" name="heroTitle" type="text" maxLength={120} required defaultValue={s.heroTitle} /></div>
          <div className="field"><label htmlFor="heroText">Intro text</label>
            <textarea id="heroText" name="heroText" maxLength={400} rows={3} defaultValue={s.heroText} /></div>
          <label className="checkline"><input type="checkbox" name="bannerOn" defaultChecked={s.bannerOn} /> Show an announcement bar at the top of the site</label>
          <div className="field"><label htmlFor="bannerText">Announcement</label>
            <input id="bannerText" name="bannerText" type="text" maxLength={200} defaultValue={s.bannerText} placeholder="e.g. Diwali offer: all templates ₹199 this week" /></div>
        </section>

        <section className="panel" aria-labelledby="p-h">
          <h2 className="h3" id="p-h">Payments and publishing</h2>
          <fieldset className="radios">
            <legend className="sr-only">How hosts publish</legend>
            <label className="radiocard">
              <input type="radio" name="paymentsMode" value="razorpay" defaultChecked={s.paymentsMode === "razorpay"} />
              <span><b>Hosts pay with Razorpay</b><small>Each invitation is paid for once, at the template price below.{!keysReady && " Razorpay keys are not set yet, so payment will not work until they are."}</small></span>
            </label>
            <label className="radiocard">
              <input type="radio" name="paymentsMode" value="free" defaultChecked={s.paymentsMode === "free"} />
              <span><b>Publishing is free</b><small>Hosts publish without paying. Useful for a launch offer or while payments are being set up.</small></span>
            </label>
          </fieldset>
          <label className="checkline"><input type="checkbox" name="acceptingNew" defaultChecked={s.acceptingNew} /> Accept new invitations (untick to pause sign-ups for new invitations; existing ones keep working)</label>
          <label className="checkline"><input type="checkbox" name="watermark" defaultChecked={s.watermark} /> Put the logo watermark on previews of unpaid invitations</label>
        </section>

        <section className="panel flush" aria-labelledby="t-h">
          <div className="padhead">
            <h2 className="h3" id="t-h">Templates and prices</h2>
            <p className="note">Leave a price empty to use the standard price. 0 makes a template free. Hidden templates are not offered for new invitations.</p>
          </div>
          <table className="rtable pricetable">
            <thead><tr><th>Template</th><th>Standard</th><th>Your price (₹)</th><th>Offered</th></tr></thead>
            <tbody>
              {designs.map((d) => (
                <tr key={d.n}>
                  <td data-label="Template">
                    <span className="invcell">
                      <span className="art minithumb" dangerouslySetInnerHTML={{ __html: artSvg(d) }} />
                      <span><b>{d.n}</b><small className="sub">{catLabel(d.c)}</small></span>
                    </span>
                  </td>
                  <td data-label="Standard" className="num">₹{d.p}</td>
                  <td data-label="Your price">
                    <input className="priceinput" type="number" inputMode="numeric" min={0} max={100000} step={1} name={`price:${d.n}`}
                      aria-label={`Price for ${d.n}`} placeholder={String(d.p)} defaultValue={s.prices[d.n] ?? ""} />
                  </td>
                  <td data-label="Offered">
                    <label className="switch"><input type="checkbox" name={`show:${d.n}`} defaultChecked={!s.hiddenDesigns.includes(d.n)} /><span>Show</span></label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="savebar adminsave">
          <div className="savebtns"><button className="btn" type="submit">Save settings</button></div>
        </div>
      </form>

      <section className="panel" aria-labelledby="ad-h">
        <h2 className="h3" id="ad-h">Admins</h2>
        <p className="note">Admins can see every order, customer and invitation and change these settings.</p>
        <ul className="minilist">
          {admins.rows.map((a) => (
            <li key={a.id}>
              <span className="mlmain"><Link href={`/admin/customers/${a.id}`}><b>{a.email ?? a.id}</b></Link>{a.id === me.userId && <span className="note">You</span>}</span>
              {admins.rows.length > 1 && (
                <form action={customerRole} className="mlside">
                  <input type="hidden" name="id" value={a.id} /><input type="hidden" name="admin" value="0" /><input type="hidden" name="back" value="/admin/settings" />
                  <ConfirmSubmit className="btn ghost small" question={`Remove admin access from ${a.email ?? "this account"}?`}>Remove</ConfirmSubmit>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addAdminByEmail} className="inlineform">
          <input type="hidden" name="back" value="/admin/settings" />
          <label htmlFor="newadmin" className="sr-only">Email of the new admin</label>
          <input id="newadmin" type="email" name="email" required placeholder="Email of someone who has signed up" />
          <ConfirmSubmit className="btn small" question="Give this person full admin access?">Add admin</ConfirmSubmit>
        </form>
      </section>
    </>
  );
}
