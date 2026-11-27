"use client";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type Action = (fd: FormData) => Promise<void>;

/**
 * The editor's buttons. Drafts get "Save draft" and "Save & pay"; a published invitation just
 * saves. The price follows the template picked in the form. Sticks to the bottom on phones.
 */
export default function SaveBar({
  formId, prices, freeAll = false, published, saveDraft, saveAndPay, status,
}: {
  formId: string; prices: Record<string, number>; freeAll?: boolean; published: boolean;
  saveDraft: Action; saveAndPay: Action; status?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  const [design, setDesign] = useState("");

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const read = () => setDesign(String(new FormData(form).get("design") ?? ""));
    read();
    form.addEventListener("change", read);
    return () => form.removeEventListener("change", read);
  }, [formId]);

  const price = prices[design];
  const free = freeAll || price === 0;

  return (
    <div className="savebar">
      <div className="savebtns">
        {published ? (
          <button className="btn" type="submit" formAction={saveDraft} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        ) : (
          <>
            <button className="btn ghost" type="submit" formAction={saveDraft} disabled={pending}>
              {pending ? "Saving…" : "Save draft"}
            </button>
            <button className="btn" type="submit" formAction={saveAndPay} disabled={pending}>
              {free ? "Save & publish" : price ? `Save & pay ₹${price.toLocaleString("en-IN")}` : "Save & pay"}
            </button>
          </>
        )}
      </div>
      <div className="savestatus">{status}</div>
    </div>
  );
}
