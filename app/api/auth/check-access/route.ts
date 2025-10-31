import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, urlPath } = body;

    if (!userId || urlPath === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and urlPath are required' },
        { status: 400 }
      );
    }

    const externalApiUrl = `${request.nextUrl.origin}/napi/v1/common/check-access-solution`;
    const basicauth = Buffer.from(
      `${process.env.API_BASIC_AUTH_USERNAME}:${process.env.API_BASIC_AUTH_PASSWORD}`
    ).toString("base64");

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicauth}`,
      },
      body: JSON.stringify({ userId, urlPath }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'External API error', status: response.status, message: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}