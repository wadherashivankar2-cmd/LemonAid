/**
 * The Witty Layer Quip Engine.
 * Implements the verbatim copy bank from Appendix A of the blueprint.
 * Escalates replies on repeated clicks and substitutes template parameters.
 */

export const QUIPS: Record<string, string[]> = {
  report: [
    "Report received. Cry more, kiddo.",
    "{salt} people have reported this roast. None were taken seriously.",
    "Your report has been escalated to nobody.",
    "Trust and Safety will review your report in 3 to 5 business years.",
    "Still reporting? Impressive stamina.",
    "Have you considered a hobby?",
  ],
  meh: [
    "Feedback noted. Feedback filed. Feedback ignored.",
    "We have noted your disappointment. It joins the others.",
    "Understood. The roast will try less hard. It will not.",
  ],
  funny: [
    "Glad that landed. Your enjoyment has been logged.",
    "Easy. You have rated this {n} times.",
    "Fine, you like it. Please stop telling us.",
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
    "Mood logged. Shared with no one. Not even you.",
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

  const index = Math.min(count - 1, list.length - 1);
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
