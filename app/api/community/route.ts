import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { publicFamily, readFamily, updateFamily } from "@/lib/store";
import { communityOf } from "@/lib/community/model";
import { mutateCommunity } from "@/lib/community/mutations";
import { check, CommunityError } from "@/lib/community/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "huynh_tan_visitor";
function visitor(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : crypto.randomUUID();
}
const ownerOf = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function GET(request: Request) {
  const data = await readFamily();
  const mine = communityOf(data)
    .attendance.filter((a) => a.owner === ownerOf(visitor(request)))
    .map(({ owner: _owner, ...item }) => item);
  return NextResponse.json(
    { mine },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    // Next may reconstruct request.url with its internal hostname behind a proxy.
    // Compare the browser Origin to the incoming HTTP Host instead.
    if (origin) {
      let parsedOrigin: URL;
      try {
        parsedOrigin = new URL(origin);
      } catch {
        throw new CommunityError("Nguồn yêu cầu không hợp lệ.", 403);
      }
      check(
        ["http:", "https:"].includes(parsedOrigin.protocol) &&
          parsedOrigin.host ===
            (request.headers.get("host") || new URL(request.url).host),
        "Nguồn yêu cầu không hợp lệ.",
        403,
      );
    }
    check(
      Number(request.headers.get("content-length") || 0) <= 150000,
      "Yêu cầu quá lớn.",
      413,
    );
    const raw = await request.text();
    check(raw.length <= 150000, "Yêu cầu quá lớn.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new CommunityError("JSON không hợp lệ.");
    }
    check(
      body && typeof body === "object" && !Array.isArray(body),
      "Yêu cầu không hợp lệ.",
    );
    const admin = isAdmin(request);
    const token = visitor(request);
    const owner = ownerOf(token);
    const { data } = await updateFamily((data) =>
      mutateCommunity(data, body, admin, owner),
    );
    const response = NextResponse.json({
      data: publicFamily(data, admin),
      mine: communityOf(data)
        .attendance.filter((a) => a.owner === owner)
        .map(({ owner: _owner, ...item }) => item),
    });
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 86400,
    });
    return response;
  } catch (error) {
    if (!(error instanceof CommunityError))
      console.error("Community mutation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof CommunityError
            ? error.message
            : "Không lưu được thay đổi. Vui lòng thử lại.",
      },
      { status: error instanceof CommunityError ? error.status : 500 },
    );
  }
}
