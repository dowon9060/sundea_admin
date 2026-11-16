import { NextResponse } from "next/server";
import { readSessionFromCookies } from "@/lib/admin-session";

export async function GET() {
  const session = await readSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ data: { adminId: session.adminId } });
}
