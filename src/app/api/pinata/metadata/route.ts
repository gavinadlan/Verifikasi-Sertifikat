import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "PINATA_JWT is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const metadata = body?.metadata;
    const name = body?.name || "certificate-metadata";

    if (!metadata) {
      return NextResponse.json({ error: "metadata is required" }, { status: 400 });
    }

    const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: { name },
        pinataContent: metadata,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.reason || data?.error || data?.message || "Failed to upload metadata" },
        { status: res.status }
      );
    }

    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected metadata upload error" }, { status: 500 });
  }
}
