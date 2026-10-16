import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!email) return bad('ایمیل الزامی است')

    const profile = await db.profile.findUnique({ where: { id: 'main' } })
    if (!profile || profile.email !== email) {
      return NextResponse.json({ error: 'ایمیل یافت نشد' }, { status: 401 })
    }
    return NextResponse.json(profile)
  } catch (e) {
    return serverError(e)
  }
}
