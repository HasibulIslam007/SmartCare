import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const allowed =
  /^(auth\/(login|register|logout|forgot-password|reset-password|verify-email(?:\/resend)?|mfa(?:\/(enroll|activate|disable|challenge))?)|users\/me|users\/[\w-]+\/role|settings|departments(?:\/[\w-]+(?:\/archive)?)?|doctors(?:\/[\w-]+(?:\/(availability|schedules|archive))?)?|appointments(?:\/[\w-]+\/(cancel|complete|record))?|queue\/[\w-]+(?:\/next)?|patients(?:\/me|\/[\w-]+\/history)?|reports(?:\/shared\/[\w-]+|\/[\w-]+(?:\/(download|content|status|shares(?:\/[\w-]+\/revoke)?))?)?|prescriptions\/[\w-]+\/download|notifications(?:\/(unread-count|read-all|[\w-]+\/read|preferences))?|admin\/(users|analytics|settings|departments|doctors)|health)$/;
async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (!allowed.test(endpoint))
    return NextResponse.json(
      { success: false, message: "Not found", data: null },
      { status: 404 },
    );
  if (
    req.method !== "GET" &&
    req.headers.get("origin") !==
      (process.env.APP_ORIGIN ?? "http://127.0.0.1:3000")
  )
    return NextResponse.json(
      { success: false, message: "Invalid request origin", data: null },
      { status: 403 },
    );
  const jar = await cookies();
  if (endpoint === "auth/logout") {
    if (req.method !== "POST") return new NextResponse(null, { status: 405 });
    jar.delete("smartcare_session");
    return NextResponse.json({ success: true, data: null });
  }
  const token = jar.get("smartcare_session")?.value;
  try {
    const contentType = req.headers.get("content-type") ?? "application/json";
    const body = req.method === "GET" ? undefined : await req.arrayBuffer();
    if (body && body.byteLength > 11 * 1024 * 1024)
      return NextResponse.json(
        { success: false, message: "Request too large", data: null },
        { status: 413 },
      );
    const response = await fetch(
      `${process.env.BACKEND_URL ?? "http://127.0.0.1:3001"}/api/v1/${endpoint}${req.nextUrl.search}`,
      {
        method: req.method,
        headers: {
          "Content-Type": contentType,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const responseType = response.headers.get("content-type") ?? "";
    if (!responseType.includes("application/json")) {
      const file = await response.arrayBuffer();
      return new NextResponse(file, {
        status: response.status,
        headers: {
          "Content-Type": responseType || "application/octet-stream",
          ...(response.headers.get("content-disposition") ? { "Content-Disposition": response.headers.get("content-disposition")! } : {}),
          "Cache-Control": "no-store",
        },
      });
    }
    const data = await response.json();
    const issuesSession =
      endpoint === "auth/login" ||
      endpoint === "auth/register" ||
      endpoint === "auth/mfa/challenge";
    // A password sign-in that needs a second factor returns no token, so the
    // cookie is only written when one was actually issued.
    if (
      response.ok &&
      issuesSession &&
      typeof data.data?.accessToken === "string"
    ) {
      jar.set("smartcare_session", data.data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: data.data.expiresIn,
      });
      delete data.data.accessToken;
    }
    if (response.status === 401 && endpoint === "users/me")
      jar.delete("smartcare_session");
    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "The hospital service is temporarily unavailable. Please try again.",
        data: null,
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT };
