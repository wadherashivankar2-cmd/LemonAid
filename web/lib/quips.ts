/**
 * The Witty Layer Quip Engine.
 * Implements the verbatim copy bank from Appendix A of the blueprint.
 * Escalates replies on repeated clicks and substitutes template parameters.
 */

export const QUIPS: Record<string, string[]> = {
  report: [
    "Reporting this? Cry to the authorities.",
    "Crying to the referee won't make you any cooler.",
    "{salt} people cried to the ref. Still won't make you any cooler.",
    "Your report has been escalated to nobody.",
    "Have you considered a hobby?",
  ],
  meh: [
    "Truth hurts. Buy a helmet.",
    "Cope, seethe, and try again.",
    "Your denial has been noted and discarded.",
    "Cry about it in your diary.",
  ],
  funny: [
    "Glad to be of service to your downfall.",
    "Clicking it twice won't make it hurt less.",
    "Validation accepted, your pride declined.",
    "Bro actually enjoyed getting trashed. Respect.",
  ],
  shareX: [
    "Broadcasting your own public humiliation? Bold strategy.",
    "Tweeting your shame won't get you followers.",
  ],
  downloadCard: [
    "Generating high-res proof of your disappointment. Print it out and show your parents.",
    "Downloaded. Hang it right next to your participation trophies.",
  ],
  paywallDismiss: [
    "Zero dollars deducted. 100% pride destroyed.",
  ],
  humiliateFriend: [
    "Misery loves company. Dragging your friends into the mud?",
    "Spreading trauma like it's your full-time job. Respect.",
  ],
  charityDismiss: [
    "Your karmic debt remains unpaid.",
  ],
  supportFounder: [
    "Your pity like has been logged. Founder remains broke.",
    "Clicking heart won't pay the Groq API bill, but thanks.",
    "Moral support noted. Financial support still zero.",
    "Founder feels 0.001% better about life choices.",
    "Another pity like. We're printing it out to burn for warmth.",
  ],
  camouflagedEnter: [
    "Type something first before trying to press Enter.",
  ],
  trollEgo: [
    "Can't you see 'Enter' right in front of you? Open your eyes.",
    "It literally says 'Enter' right above. Are you blind?",
    "Imagine clicking a giant button like an NPC. It literally says 'Enter' right above.",
  ],
  suggestions: [
    "The suggestion box is located in your nearest trash bin.",
    "Bold of you to assume anyone asked for your input.",
    "Your opinion has been successfully forwarded to /dev/null.",
    "Keep your suggestions in the drafts where they belong.",
  ],
  closeSuggestion: [
    "Glad we agree your idea was trash.",
    "Cope harder.",
    "Don't let the door hit your ego on the way out.",
  ],
  reportDismiss: [
    "Report saved directly to our spam folder.",
  ],
  twitterReturn: [
    "Back already? Did Twitter ratio you that fast?",
  ],
  human: [
    "All of our humans are in standups. Estimated wait: 6 to 8 business years.",
    "You are now number 48,213 in the queue.",
    "Your call is important to us. It has been placed in a folder.",
  ],
  pro: [
    "Pro is coming soon. It will include the same roast, but billed.",
    "Pro waitlist: full. Pro product: not started.",
  ],
  cancel: [
    "You are not subscribed. That is more commitment than most gym memberships get.",
    "Cancellation complete. You can now not-subscribe again.",
  ],
  delete: [
    "Done. We stored nothing, so this was our fastest feature.",
    "Deleted again. It is still nothing.",
  ],
  signin: [
    "Sign-in is not required, not available, and not recommended.",
    "Still no accounts. This is the closest thing to a relationship we offer.",
  ],
  support: [
    "Ticket created. Your position in the queue: 48,213.",
    "Your ticket has been merged with 48,212 others. They all say the same.",
    "Resolution estimate: never. Satisfaction survey: soon.",
  ],
  cookies: [
    "Thanks. Nothing changed. We do not use cookies, we just like banners.",
  ],
  careers: [
    "We are not hiring. We are not a company.",
    "Still not hiring. Still not a company.",
  ],
  press: [
    "No press yet. Quote tweets count.",
    "Press inquiries should be sent to the group chat.",
  ],
  help: [
    "Help is not included in the Free plan.",
    "The Free plan includes this message.",
  ],
  rate: [
    "Thanks for your {stars} stars. We rounded it to 3.",
  ],
  mood: [
    "Mood noted. The universe remains entirely indifferent.",
    "Logging your feelings won't fix your personality.",
    "Recorded. Even your therapist would charge double for this.",
    "Your mood has been filed directly into /dev/null.",
  ],
  moodSad: [
    "Take care today. No jokes from us.",
  ],
  konami: [
    "Premium unlocked. It is the same roast, but you feel special.",
  ],
  language: [
    "Translation unavailable. Disappointment is universal.",
  ],
  verify: [
    "Verification complete. Results inconclusive.",
  ],
  darkmode: [
    "You are already in dark mode. Look inside.",
  ],
  newsletter: [
    "Subscribed. No emails will be sent. Check your spam anyway.",
  ],
  shareFriend: [
    "Link copied. Choose your friend wisely.",
  ],
  accessibility: [
    "Roasts are available in plain text, which is all they ever were.",
  ],
  againSpam: [
    "A pattern. Have you considered a hobby?",
  ],
};

const clickCounts: Record<string, number> = {};
type QuipListener = (message: string) => void;
const listeners = new Set<QuipListener>();

export function onQuip(listener: QuipListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function quip(key: string, vars?: Record<string, string | number>): string {
  const count = (clickCounts[key] || 0) + 1;
  clickCounts[key] = count;

  const list = QUIPS[key] || [
    "Action acknowledged. Absolutely nothing happened.",
  ];

  const index = (count - 1) % list.length;
  let template = list[index];

  // Placeholder substitution
  const saltVal = vars?.salt !== undefined ? String(vars.salt) : "Several";
  const starsVal = vars?.stars !== undefined ? String(vars.stars) : "Several";
  const nVal = vars?.n !== undefined ? String(vars.n) : String(count);

  template = template
    .replace(/\{n\}/g, nVal)
    .replace(/\{salt\}/g, saltVal)
    .replace(/\{stars\}/g, starsVal);

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  listeners.forEach((fn) => fn(template));
  return template;
}

export function getClickCount(key: string): number {
  return clickCounts[key] || 0;
}
