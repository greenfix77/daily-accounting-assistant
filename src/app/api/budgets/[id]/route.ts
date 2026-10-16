import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, budgetItemDTO, serverError, toNum } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.budget.findUnique({ where: { id }, include: { category: true } })
    if (!existing) return bad('بودجه یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ بودجه باید بزرگ‌تر از صفر باشد')

    const updated = await db.budget.update({
      where: { id },
      data: { amount },
      include: { category: true },
    })
    return NextResponse.json(await budgetItemDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.budget.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('بودجه یافت نشد', 404)
    await db.budget.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
