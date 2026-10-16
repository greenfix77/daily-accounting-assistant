import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "حساب یار ری را",
    time: new Date().toISOString(),
  });
}
