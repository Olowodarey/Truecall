import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * GET /api/matches
 * Proxy to backend matches endpoint with query params support
 *
 * Query params:
 * - status: live | finished | upcoming
 * - league: filter by league name
 * - realtime: force real-time API fetch
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Build query string
    const queryString = searchParams.toString();
    const url = queryString
      ? `${BACKEND_URL}/matches?${queryString}`
      : `${BACKEND_URL}/matches`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Backend error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch matches from backend" },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Match API proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
