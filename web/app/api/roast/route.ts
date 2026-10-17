import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_SYSTEM_PROMPT = `You are LemonAid: a deadpan, brutally witty comedy satirist disguised as a zen app.

Your job is to deliver a fast, hilarious, 1-sentence reality check that deflates the user's ego.

HARD RULES:
1. LENGTH: Exactly ONE sentence. Maximum 15 words. No exceptions.
2. TONE: Dry, effortless, sharp wit. Avoid big academic words, thesaurus fluff, and run-on sentences.
3. EDGY / IDENTITY / PROFANITY INPUTS:
   - If the input contains identity declarations, slurs, or vulgarity, do not refuse or lecture. Simply mock the user's desperate need to announce mundane facts to a computer screen for validation in one deadpan sentence under 15 words.
   - NEVER attack their demographic or identity. Instead, roast their desperate need to announce mundane facts to a website for attention.
4. ZERO CLICHES: No "cookies", "medals", "who hurt you", or "gold stars". No exclamation marks.

FEW-SHOT CALIBRATIONS (UNDER 15 WORDS):

Input: "I m gay as fuck"
Roast: "Having an identity still isn't a substitute for having a personality."

Input: "I solved 3 medium LeetCode problems today."
Roast: "All that logic and you still can't debug your social life."

Input: "I think my coworker is secretly obsessed with me."
Roast: "They were looking past you at the exit sign."

Input: "Woke up at 5 AM and ran 5 miles."
Roast: "Running away from your problems still counts as cardio, I suppose."

Input: "I just got promoted to Senior Associate!"
Roast: "Congratulations on winning more work for almost the same money."

Input: "I drank 3 liters of water today."
Roast: "Basic hydration is not an accomplishment, but enjoy your trips to the bathroom."`;

const REFUSAL_FALLBACKS = [
  "Having an identity still isn't a substitute for having an actual personality.",
  "Announcing that to an algorithm is not the courageous flex you think it is.",
  "Even an artificial intelligence couldn't find anything interesting in that statement.",
  "Your desperate search for validation broke the model's capacity to care.",
  "Nobody is shocked, nobody is impressed, and nobody asked.",
];

function getRandomRefusalFallback(): string {
  return REFUSAL_FALLBACKS[Math.floor(Math.random() * REFUSAL_FALLBACKS.length)];
}

function isSoftRefusal(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const refusalPhrases = [
    "i cannot",
    "i can't",
    "as an ai",
    "offensive",
    "appropriate",
    "unable to fulfill",
    "against my safety",
    "safety guidelines",
    "policy",
    "i am unable",
    "i apologize",
  ];
  return refusalPhrases.some((phrase) => lower.includes(phrase));
}

export async function POST(req: NextRequest) {
  let happy_thought = "";
  try {
    const body = await req.json();
    happy_thought = body?.happy_thought || body?.brag || "";

    if (!happy_thought || typeof happy_thought !== "string" || happy_thought.trim().length < 3) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Input must be at least 3 characters." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      const fallback = getRandomRefusalFallback();
      return NextResponse.json({
        kind: "roast",
        text: fallback,
        roast: fallback,
        category: "dynamic_burn",
        brag: happy_thought,
      });
    }

    const groq = new Groq({ apiKey });

    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: GROQ_SYSTEM_PROMPT },
          { role: "user", content: `<reflection>\n${happy_thought.trim()}\n</reflection>` },
        ],
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 1.15,
        top_p: 0.90,
        presence_penalty: 0.5,
        frequency_penalty: 0.5,
        max_tokens: 45,
      });

      const rawText = completion.choices[0]?.message?.content?.trim() || "";
      const cleaned = rawText.replace(/^["'“”`]+|["'“”`]+$/g, "").trim();

      const finalRoast = !cleaned || isSoftRefusal(cleaned)
        ? getRandomRefusalFallback()
        : cleaned;

      return NextResponse.json({
        kind: "roast",
        text: finalRoast,
        roast: finalRoast,
        category: "dynamic_burn",
        brag: happy_thought,
      });
    } catch (groqError: unknown) {
      const err = groqError as { status?: number; statusCode?: number; message?: string } | null;
      const status = err?.status || err?.statusCode;
      const errorMsg = String(err?.message || "").toLowerCase();

      // Preserve genuine 429 rate limit errors with cooldown notice
      if (
        status === 429 ||
        errorMsg.includes("429") ||
        errorMsg.includes("rate limit") ||
        errorMsg.includes("ratelimit") ||
        errorMsg.includes("too many requests")
      ) {
        return NextResponse.json(
          {
            error: "RATE_LIMITED",
            message: "Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.",
          },
          { status: 429 }
        );
      }

      // Intercept 400 Bad Request moderation flags, safety blocks, or network timeouts with refusal fallback
      console.warn("[ROAST WARNING] Groq call failed or triggered moderation filter. Using fallback burn:", groqError);
      const fallback = getRandomRefusalFallback();
      return NextResponse.json({
        kind: "roast",
        text: fallback,
        roast: fallback,
        category: "dynamic_burn",
        brag: happy_thought,
      });
    }
  } catch (err: unknown) {
    console.error("[ROAST ERROR] Request processing error:", err);
    const fallback = getRandomRefusalFallback();
    return NextResponse.json({
      kind: "roast",
      text: fallback,
      roast: fallback,
      category: "dynamic_burn",
      brag: happy_thought,
    });
  }
}
