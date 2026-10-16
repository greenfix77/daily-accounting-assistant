import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'کاربر'
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email) return bad('ایمیل الزامی است')

    const profile = await db.profile.upsert({
      where: { id: 'main' },
      update: { name, email, onboarded: true },
      create: { id: 'main', name, email, onboarded: true },
    })
    return NextResponse.json(profile)
  } catch (e) {
    return serverError(e)
  }
}
