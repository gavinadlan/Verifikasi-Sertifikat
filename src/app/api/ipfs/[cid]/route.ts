import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ipfs/[cid]
 * Server-side proxy for fetching IPFS metadata.
 * Tries multiple gateways with fallback to avoid rate limiting (429).
 */

const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { cid: string } }
) {
  try {
    const { cid } = params;

    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    // Try each gateway in order until one succeeds
    let lastError = "";
    for (const gateway of GATEWAYS) {
      try {
        const res = await fetch(`${gateway}${cid}`, {
          signal: AbortSignal.timeout(10000), // 10s timeout per gateway
          next: { revalidate: 300 }, // cache for 5 minutes
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }

        lastError = `${gateway}: ${res.status} ${res.statusText}`;
        console.warn(`[IPFS proxy] ${lastError}`);

        // If it's not a rate limit error, no point trying other gateways for the same CID
        if (res.status !== 429 && res.status !== 503 && res.status !== 504) {
          break;
        }
      } catch (fetchErr: any) {
        lastError = `${gateway}: ${fetchErr.message}`;
        console.warn(`[IPFS proxy] ${lastError}`);
        // Continue to next gateway on timeout/network error
      }
    }

    return NextResponse.json(
      { error: `All IPFS gateways failed. Last: ${lastError}` },
      { status: 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected IPFS fetch error" },
      { status: 500 }
    );
  }
}
