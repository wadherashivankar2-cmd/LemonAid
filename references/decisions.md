# Architecture & Design Decisions Log

This document records all functional, architectural, or design decisions and deviations from the blueprint, including rationale.

## Record of Decisions

### DEC-001: Python 3.11 for Backend Virtual Environment
- **Context**: The host machine has Python 3.14, 3.13, and 3.11 installed.
- **Decision**: Target Python 3.11 (`py -3.11`) for the local virtual environment and in `Dockerfile`.
- **Rationale**: Python 3.11 has full, mature precompiled wheel support for PyTorch CPU, sentence-transformers, spacy, and scikit-learn without C++ build chain failures on Windows.

### DEC-002: Next.js 14 App Router with Tailwind and Lucide Icons
- **Context**: Modern frontend requirements with static generation, edge API routes for OG cards, and strict visual restraint.
- **Decision**: Scaffold `web/` using Next.js 14 App Router, Tailwind CSS, Lucide icons, and shadcn-compatible styling patterns.
- **Rationale**: Direct adherence to Section 3 of user directives (restrained palette, zero decorative animations, no React Bits, no gradients/glows).

### DEC-003: Graceful In-Memory Fallbacks for Upstash
- **Context**: In local development and free tier environments, external Redis might not be provisioned or reachable.
- **Decision**: Backend rate limits and anonymous vote counters fall back to in-memory deques and dicts seamlessly if `UPSTASH_URL` or `UPSTASH_TOKEN` are omitted or unreachable.
- **Rationale**: Zero external blocking dependencies for dev, tests, and CI.

### DEC-004: Standardized Constant-Time HMAC Signature Verification
- **Context**: Share links encode user brag and roast payload with an HMAC-SHA256 signature to prevent arbitrary text injection.
- **Decision**: Python uses `hmac.compare_digest`. Web uses Web Crypto API with constant-time equality check on signatures.
- **Rationale**: Eliminates timing attacks while remaining edge-compatible in Next.js.
