import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Debug API route is working",
    env: {
      hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || "NOT SET",
      hasTwitterClientId: !!process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
    },
    timestamp: new Date().toISOString(),
  });
}
