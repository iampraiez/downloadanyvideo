import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const config = {
  matcher: ["/api/download"],
};

export function middleware(request: NextRequest): NextResponse {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";

  const result = checkRateLimit(ip);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", "10");
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}
