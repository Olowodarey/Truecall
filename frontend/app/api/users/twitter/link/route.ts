import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://truecall-production.up.railway.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, twitterHandle } = body;

    if (!address || !twitterHandle) {
      return NextResponse.json(
        { error: "Address and Twitter handle required" },
        { status: 400 },
      );
    }

    // Validate Ethereum address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 },
      );
    }

    const response = await fetch(`${BACKEND_URL}/users/link-twitter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        twitterHandle: twitterHandle.replace("@", ""), // Remove @ if present
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || "Failed to link Twitter" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error linking Twitter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
