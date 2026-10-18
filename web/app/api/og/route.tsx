import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { base64UrlDecode, verifySig } from "@/lib/sig";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const b = searchParams.get("b");
    const r = searchParams.get("r");
    const sig = searchParams.get("sig");

    if (!b || !r || !sig) {
      return renderFallback("Gratitude Journal", "A private reflection on life.");
    }

    // Cap parameter lengths
    if (b.length > 500 || r.length > 800 || sig.length > 32) {
      return renderFallback("Invalid Share Link", "The provided link parameters exceed safety bounds.");
    }

    const brag = base64UrlDecode(b);
    const roast = base64UrlDecode(r);

    if (brag.length > 200 || roast.length > 300) {
      return renderFallback("Invalid Share Link", "Content exceeds maximum length bounds.");
    }

    const isValid = await verifySig(brag, roast, sig);
    if (!isValid) {
      return renderFallback("Tampered Entry", "This gratitude entry has been modified or unsigned.");
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
            fontFamily: "sans-serif",
          }}
        >
          {/* Top Half: What made me happy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "50%",
              backgroundColor: "#FAF8F5",
              color: "#1F1B16",
              padding: "48px 64px",
              borderBottom: "2px solid #E7E2DA",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6B645B",
                marginBottom: 16,
              }}
            >
              What made me happy
            </div>
            <div
              style={{
                fontSize: 32,
                fontStyle: "italic",
                lineHeight: 1.3,
                color: "#1F1B16",
              }}
            >
              {`“${brag.trim()}”`}
            </div>
          </div>

          {/* Bottom Half: The Burn */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "50%",
              backgroundColor: "#000000",
              color: "#FFFFFF",
              padding: "48px 64px",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#C62828",
                marginBottom: 16,
              }}
            >
              The burn
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                lineHeight: 1.25,
                color: "#FFFFFF",
                paddingRight: 80,
              }}
            >
              {roast}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 28,
                right: 48,
                fontSize: 18,
                color: "#8A8A8A",
              }}
            >
              lemon-aid-app.vercel.app
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch {
    return renderFallback("Gratitude Journal", "Reflection and truth.");
  }
}

function renderFallback(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#FAF8F5",
          color: "#1F1B16",
          padding: 64,
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, marginBottom: 16 }}>{title}</div>
        <div style={{ fontSize: 24, color: "#6B645B" }}>{subtitle}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
