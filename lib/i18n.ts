import type { Lang } from "./designs";

export type GuestStrings = {
  inv: string; h: string; name: string; reply: string; yes: string; maybe: string; no: string;
  guests: string; note: string; send: string; update: string; thanks: string; need: string;
  fail: string; foot: string; tap: string;
};

export const G: Record<Lang, GuestStrings> = {
  en: {
    inv: "You are invited", h: "Will you join us?", name: "Your name", reply: "Your reply",
    yes: "Joyfully yes", maybe: "Maybe", no: "Sadly no", guests: "Guests",
    note: "A blessing or note for the hosts (optional)", send: "Send my reply", update: "Update my reply",
    thanks: "Thank you, {n}! Your reply has been sent.", need: "Please enter your name.",
    fail: "Your reply could not be saved. Please try again.", foot: "Made with Nimantran", tap: "Tap to open",
  },
  hi: {
    inv: "आप आमंत्रित हैं", h: "क्या आप आएँगे?", name: "आपका नाम", reply: "आपका जवाब",
    yes: "खुशी से हाँ", maybe: "शायद", no: "खेद है, नहीं", guests: "मेहमान",
    note: "मेज़बान के लिए शुभकामना या संदेश (वैकल्पिक)", send: "जवाब भेजें", update: "जवाब बदलें",
    thanks: "धन्यवाद, {n}! आपका जवाब भेज दिया गया।", need: "कृपया अपना नाम लिखें।",
    fail: "आपका जवाब सहेजा नहीं जा सका। कृपया फिर कोशिश करें।", foot: "Nimantran से बना", tap: "खोलने के लिए टैप करें",
  },
  mr: {
    inv: "तुम्हाला आमंत्रण आहे", h: "तुम्ही याल का?", name: "तुमचे नाव", reply: "तुमचे उत्तर",
    yes: "आनंदाने हो", maybe: "कदाचित", no: "क्षमस्व, नाही", guests: "पाहुणे",
    note: "यजमानांसाठी शुभेच्छा किंवा संदेश (ऐच्छिक)", send: "उत्तर पाठवा", update: "उत्तर बदला",
    thanks: "धन्यवाद, {n}! तुमचे उत्तर पाठवले गेले.", need: "कृपया तुमचे नाव लिहा.",
    fail: "तुमचे उत्तर जतन होऊ शकले नाही. कृपया पुन्हा प्रयत्न करा.", foot: "Nimantran ने बनवलेले", tap: "उघडण्यासाठी टॅप करा",
  },
};

export function asLang(v: string | null | undefined): Lang {
  return v === "hi" || v === "mr" ? v : "en";
}
