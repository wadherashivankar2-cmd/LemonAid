import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry || now > entry.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}

if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipRequestMap.entries()) {
      if (now > entry.resetTime) {
        ipRequestMap.delete(ip);
      }
    }
  }, RATE_LIMIT_WINDOW_MS * 2);
}

const FALLBACK_ROASTS = [
  "You broke our reflection engine with that level of mediocrity. Try again later.",
  "Even our AI needed a coffee break after reading that entry. Balance restored.",
  "Congratulations, you overwhelmed the server with sheer unadulterated hesitation."
];

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    const { allowed, retryAfter } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many reflections. Give your ego a breather.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("[API/ROAST] GROQ_API_KEY is not configured.");
      return NextResponse.json(
        { error: "Service configuration error. Please contact the administrator." },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON format." }, { status: 400 });
    }

    const { text, mood } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Reflection text is required." }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json({ error: "Reflection text cannot be empty." }, { status: 400 });
    }

    if (trimmedText.length > 300) {
      return NextResponse.json(
        { error: "Reflection exceeds maximum length of 300 characters." },
        { status: 400 }
      );
    }

    const safeMood = typeof mood === "string" ? mood.slice(0, 20) : "neutral";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const systemPrompt = `You are LemonAid, a brutally honest, sarcastic friend pretending to be a wellness app.
The user is sharing a proud moment, small win, or happy thought.
Mood selected: "${safeMood}".

CRITICAL RULES:
- Length: EXACTLY 1 to 2 short sentences (max 30 words).
- Language: Keep it simple, everyday English. No fancy SAT words, no weird abstract metaphors.
- Tone: Playful, savage reality check. Like a best friend clowning them for hyping up basic human behavior.
- Direct & Punchy: Hit the punchline immediately. No setup filler.`;

    const modelsToTry = Array.from(
      new Set(
        [
          process.env.GROQ_MODEL,
          "openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-120b"
        ].filter((m): m is string => Boolean(m && !m.includes("llama")))
      )
    );

    let roast = "";
    let isRateLimited = false;

    try {
      for (const model of modelsToTry) {
        if (controller.signal.aborted) break;

        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: trimmedText }
              ],
              temperature: 0.9,
              max_tokens: 120
            }),
            signal: controller.signal
          });

          if (response.status === 429) {
            isRateLimited = true;
            const errorText = await response.text();
            console.error(`[Roast API Error] Model: ${model} failed. Status: ${response.status}. Details:`, errorText);
            break;
          }

          if (response.status === 404 || response.status === 400) {
            const errorText = await response.text();
            console.error(`[Roast API Error] Model: ${model} failed. Status: ${response.status}. Details:`, errorText);
            continue;
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Roast API Error] Model: ${model} failed. Status: ${response.status}. Details:`, errorText);
            continue;
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            roast = content;
            console.log(`[Roast API Success] Model: ${model} generated roast successfully.`);
            break;
          } else {
            console.error(`[Roast API Error] Model: ${model} failed. Status: 200. Details: Empty choices returned`, data);
          }
        } catch (fetchError: unknown) {
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            console.error(`[Roast API Error] Model: ${model} aborted/timed out.`);
            throw fetchError;
          }
          console.error(`[Roast API Error] Model: ${model} failed with exception:`, fetchError);
        }
      }
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[Roast API Error] Upstream LLM call timed out after 7s. Using fallback.");
        const fallback = FALLBACK_ROASTS[Math.floor(Math.random() * FALLBACK_ROASTS.length)];
        return NextResponse.json({ roast: fallback, isFallback: true }, { status: 200 });
      }

      console.error("[Roast API Error] Network error during upstream call:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to judgment engine." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (isRateLimited) {
      console.error("[Roast API Error] Upstream Groq rate limited (429).");
      return NextResponse.json(
        { error: "Upstream engine is overwhelmed. Please wait a moment." },
        { status: 503 }
      );
    }

    if (!roast) {
      console.error("[Roast API Error] No completion received from any model. Falling back to static roast.");
      const fallback = FALLBACK_ROASTS[Math.floor(Math.random() * FALLBACK_ROASTS.length)];
      return NextResponse.json({ roast: fallback, isFallback: true }, { status: 200 });
    }

    return NextResponse.json({ roast });
  } catch (err) {
    console.error("[Roast API Error] Unexpected route failure:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred processing your reflection." },
      { status: 500 }
    );
  }
}
