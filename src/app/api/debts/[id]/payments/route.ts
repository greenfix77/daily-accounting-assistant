import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, debtDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const includePayments = { payments: { orderBy: { date: 'desc' as const } } }

// POST /api/debts/[id]/payments {amount>0, date?, notes?}
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const debt = await db.debt.findUnique({ where: { id } })
    if (!debt) return bad('بدهی یافت نشد', 404)
    if (debt.paidAmount >= debt.amount) {
      return NextResponse.json({ error: 'این بدهی تسویه شده است' }, { status: 409 })
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')

    const remaining = debt.amount - debt.paidAmount
    if (amount > remaining) {
      return NextResponse.json({ error: 'مبلغ بیشتر از باقیمانده است' }, { status: 400 })
    }

    const date = toDt(body.date) ?? new Date()
    const notes = toStr(body.notes) || null

    await db.$transaction([
      db.debtPayment.create({ data: { debtId: id, amount, date, notes } }),
      db.debt.update({
        where: { id },
        data: {
          paidAmount: { increment: amount },
          ...(debt.paidAmount + amount >= debt.amount ? { settledAt: date } : {}),
        },
      }),
    ])

    const updated = await db.debt.findUnique({ where: { id }, include: includePayments })
    return NextResponse.json(debtDTO(updated!))
  } catch (e) {
    return serverError(e)
  }
}
