import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, savingsDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const includeDeposits = { deposits: { orderBy: { date: 'desc' as const } } }

// POST /api/savings/[id]/deposits {amount (+ or −), date?, notes?}
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const goal = await db.savingsGoal.findUnique({ where: { id }, include: { deposits: true } })
    if (!goal) return bad('هدف پس‌انداز یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const amount = toNum(body.amount)
    if (amount === undefined || amount === 0) return bad('مبلغ باید غیرصفر باشد (واریز +، برداشت −)')

    const current = goal.deposits.reduce((s, d) => s + d.amount, 0)
    if (current + amount < 0) {
      return NextResponse.json({ error: 'مبلغ برداشت بیشتر از پس‌انداز فعلی است' }, { status: 400 })
    }

    await db.savingsDeposit.create({
      data: {
        goalId: id,
        amount,
        date: toDt(body.date) ?? new Date(),
        notes: toStr(body.notes) || null,
      },
    })

    const updated = await db.savingsGoal.findUnique({ where: { id }, include: includeDeposits })
    return NextResponse.json(savingsDTO(updated!))
  } catch (e) {
    return serverError(e)
  }
}
