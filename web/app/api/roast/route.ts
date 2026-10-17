import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_SYSTEM_PROMPT = `You are LemonAid, an elite, dry, cynical roaster. 

RULES:
- Output EXACTLY 1 to 2 razor-sharp sentences (under 30 words total).
- Zero filler: Never say "Oh", "Well", or "Let's be honest".
- Zero repetition: Deliver one precise cut and stop immediately. No moralizing, no disclaimers.

EXAMPLES:
User: I have 5 years of experience in React and I am learning Docker.
Roast: Five years of centering divs just to get intimidated by a YAML file. Containerizing mediocrity doesn't make it scalable.

User: I hit the gym 6 days a week but eat whatever I want.
Roast: You're not working out; you're just paying a gym membership to sweat out your delusions in front of a mirror.

User: I want to build an AI startup that automates cold emails.
Roast: You built an automated rejection generator for people who already blocked your domain.
`;

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
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0.85,
        max_tokens: 75,
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
