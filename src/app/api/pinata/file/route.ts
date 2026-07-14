import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return NextResponse.json({ error: "PINATA_JWT is not configured" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const name = String(form.get("name") || file.name || "certificate-file");

    const pinataForm = new FormData();
    pinataForm.append("file", file);
    pinataForm.append("pinataMetadata", JSON.stringify({ name }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataForm,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.reason || data?.error || data?.message || "Failed to upload to Pinata" },
        { status: res.status }
      );
    }

    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Unexpected upload error" }, { status: 500 });
  }
}
