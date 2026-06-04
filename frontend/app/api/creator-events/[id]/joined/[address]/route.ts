import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; address: string }> },
) {
  try {
    const { id, address } = await params;
    const response = await fetch(
      `${BACKEND_URL}/creator-events/${id}/joined/${address}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to check join status" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
