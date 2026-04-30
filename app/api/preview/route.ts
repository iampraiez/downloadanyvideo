import { NextResponse } from "next/server";
import { getMediaInfo } from "@/lib/core/resolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const result = await getMediaInfo(url);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errObj = error as { message?: string, code?: string };
    const message = errObj?.message || "Failed to extract media info";
    return NextResponse.json({ error: message }, { status: errObj?.code === "TIMEOUT" ? 504 : 500 });
  }
}
