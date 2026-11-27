import { getSettings } from "@/lib/settings";

/** "Need help?" with the support email / WhatsApp number set in the admin. Renders nothing if neither is set. */
export default async function SupportLine({ prefix = "Need help?" }: { prefix?: string }) {
  const s = await getSettings();
  const phone = s.supportPhone.replace(/[^\d+]/g, "");
  if (!s.supportEmail && !phone) return null;
  return (
    <p className="note supportline">
      {prefix}{" "}
      {s.supportEmail && <a href={`mailto:${s.supportEmail}`}>{s.supportEmail}</a>}
      {s.supportEmail && phone && " · "}
      {phone && <a href={`https://wa.me/${phone.replace(/^\+/, "")}`} target="_blank" rel="noreferrer">WhatsApp {s.supportPhone}</a>}
    </p>
  );
}
