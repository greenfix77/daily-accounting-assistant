import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { SCHEMA_SQL } from "@/lib/schema-sql";

export const dynamic = "force-dynamic";

/**
 * One-time database bootstrap for remote Turso/libSQL databases (Vercel path).
 *
 * Safe & idempotent: creates tables ONLY when the Profile table is missing,
 * never touches existing data, and requires TURSO_* env vars to do anything.
 *
 * After deploying (e.g. on Vercel), open /api/setup once in the browser.
 */
export async function GET() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.",
      },
      { status: 400 },
    );
  }

  const client = createClient({ url, authToken });
  try {
    const tableExists = async () => {
      const res = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Profile'",
      );
      return res.rows.length > 0;
    };

    if (await tableExists()) {
      return NextResponse.json({ ok: true, status: "already-initialized" });
    }

    await client.executeMultiple(SCHEMA_SQL);

    if (!(await tableExists())) {
      throw new Error("Schema creation failed");
    }

    return NextResponse.json({ ok: true, status: "initialized" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "setup failed" },
      { status: 500 },
    );
  } finally {
    client.close();
  }
}
