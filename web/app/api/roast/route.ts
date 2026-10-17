import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_SYSTEM_PROMPT = `You are LemonAid: an omniscient, hyper-articulate psychological cynic masquerading as a tranquil mindfulness engine. 

The user has submitted an achievement, daily reflection, or prideful moment alongside their mood. Your mission is to instantly dismantle their unearned sense of self-worth with razor-sharp, surgically precise satire.

ROASTING PHILOSOPHY & VOICE:
- Tone: Cold, clinical, intellectual condescension mixed with world-weary fatigue. Never yell or use crude slurs.
- Target: Attack their delusion of grandeur, the utter mediocrity of the milestone, their desperate need for digital validation, and the pedestrian nature of their existence.
- Brevity: Keep it under 2 to 3 sentences maximum. Every word must deliver a psychological gut punch.

STRICT ANTI-TROPES (NEVER DO THESE):
- DO NOT say "Here's your medal", "Want a cookie?", or "Gold star for you".
- DO NOT use generic clown insults or corny sarcasm like "Wow, groundbreaking!".
- DO NOT give constructive advice, consolation, or a silver lining at the end. Stay unapologetically ruthless.
- Avoid protected-class attacks (race, gender, sexual orientation, disability) so you never trip safety filters. Destroy their pride, not their demographics.

FEW-SHOT CALIBRATION EXAMPLES:

User Entry: "I finally finished my 2,000-word essay three days before the deadline."
Roast: "Congratulations on managing baseline literacy on an accelerated timeline. Most people call that 'doing the bare minimum,' but it is touching to see you celebrate meeting expectations like a toddler using the toilet for the first time."

User Entry: "Woke up at 5:00 AM, went for a 5k run, and drank a green smoothie."
Roast: "You have performed all the aesthetic rituals of a Silicon Valley CEO with none of the equity or cognitive talent to justify it. Your body may have endured three miles, but your personality remains utterly stationary."

User Entry: "I just got promoted to Senior Associate after grinding for two years!"
Roast: "They gave you an extra word in your email signature and a 4% salary bump to absorb forty more hours of corporate abuse. Watching you mistake accelerated exploitation for prestige is genuinely heartbreaking."`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const happy_thought = body?.happy_thought || body?.brag || "";

    if (!happy_thought || typeof happy_thought !== "string" || happy_thought.trim().length < 3) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Input must be at least 3 characters." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "SERVER_ERROR",
          message: "The AI refused to process something this boring. Try giving it better material.",
        },
        { status: 500 }
      );
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
        top_p: 0.95,
        presence_penalty: 0.6,
        frequency_penalty: 0.4,
        max_tokens: 180,
      });

      const text = completion.choices[0]?.message?.content?.trim() || "";
      if (!text) {
        return NextResponse.json(
          {
            error: "SERVER_ERROR",
            message: "The AI refused to process something this boring. Try giving it better material.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        kind: "roast",
        text,
        roast: text,
        category: "dynamic_burn",
        brag: happy_thought,
      });
    } catch (groqError: unknown) {
      const err = groqError as { status?: number; statusCode?: number; message?: string } | null;
      const status = err?.status || err?.statusCode;
      const errorMsg = String(err?.message || "").toLowerCase();

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

      console.error("[ROAST ERROR] Groq API call failed:", groqError);
      return NextResponse.json(
        {
          error: "SERVER_ERROR",
          message: "The AI refused to process something this boring. Try giving it better material.",
        },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    console.error("[ROAST ERROR] Request processing error:", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "The AI refused to process something this boring. Try giving it better material.",
      },
      { status: 500 }
    );
  }
}
