import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, savingsDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const includeDeposits = { deposits: { orderBy: { date: 'desc' as const } } }

// GET /api/savings
export async function GET() {
  try {
    const rows = await db.savingsGoal.findMany({ include: includeDeposits, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(rows.map(savingsDTO))
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/savings {name,targetAmount,targetDate?,color,icon}
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const name = toStr(body.name)?.trim()
    if (!name) return bad('نام هدف الزامی است')
    const targetAmount = toNum(body.targetAmount)
    if (targetAmount === undefined || targetAmount <= 0) return bad('مبلغ هدف باید بزرگ‌تر از صفر باشد')

    const created = await db.savingsGoal.create({
      data: {
        name,
        targetAmount,
        targetDate: toDt(body.targetDate) ?? null,
        color: toStr(body.color) || '#4E9B72',
        icon: toStr(body.icon) || 'target',
      },
      include: includeDeposits,
    })
    return NextResponse.json(savingsDTO(created))
  } catch (e) {
    return serverError(e)
  }
}
