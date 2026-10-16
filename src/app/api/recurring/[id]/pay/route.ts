import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, nextDue, recInclude, recurDTO, serverError, toDt, txDTO, txInclude } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/recurring/[id]/pay {date?} → create transaction + advance schedule
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const recurring = await db.recurring.findUnique({ where: { id } })
    if (!recurring) return bad('قسط/درآمد تکرارشونده یافت نشد', 404)

    const nd = nextDue(recurring)
    if (!nd) {
      return NextResponse.json({ error: 'این قسط تمام شده یا غیرفعال است' }, { status: 409 })
    }

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const date = toDt(body.date) ?? new Date()

    // requested date falls inside an already-paid period → reject
    if (recurring.lastPaidAt && date.getTime() < nd.getTime()) {
      return NextResponse.json({ error: 'این دوره قبلاً پرداخت شده است' }, { status: 409 })
    }

    const transaction = await db.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          type: recurring.type,
          amount: recurring.amount,
          title: recurring.title,
          accountId: recurring.accountId,
          categoryId: recurring.categoryId,
          recurringId: recurring.id,
          date,
        },
      })
      await tx.recurring.update({
        where: { id: recurring.id },
        data: { paidCount: { increment: 1 }, lastPaidAt: date },
      })
      return created
    })

    const txFull = await db.transaction.findUnique({ where: { id: transaction.id }, include: txInclude })
    const updated = await db.recurring.findUnique({ where: { id }, include: recInclude })

    return NextResponse.json({
      ok: true,
      transaction: txFull ? txDTO(txFull) : null,
      recurring: updated ? recurDTO(updated) : null,
    })
  } catch (e) {
    return serverError(e)
  }
}
