import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, savingsDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const includeDeposits = { deposits: { orderBy: { date: 'desc' as const } } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const row = await db.savingsGoal.findUnique({ where: { id }, include: includeDeposits })
    if (!row) return bad('هدف پس‌انداز یافت نشد', 404)
    return NextResponse.json(savingsDTO(row))
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.savingsGoal.findUnique({ where: { id } })
    if (!existing) return bad('هدف پس‌انداز یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: {
      name?: string
      targetAmount?: number
      targetDate?: Date | null
      color?: string
      icon?: string
    } = {}

    if (body.name !== undefined) {
      const name = toStr(body.name)?.trim()
      if (!name) return bad('نام هدف الزامی است')
      data.name = name
    }
    if (body.targetAmount !== undefined) {
      const targetAmount = toNum(body.targetAmount)
      if (targetAmount === undefined || targetAmount <= 0)
        return bad('مبلغ هدف باید بزرگ‌تر از صفر باشد')
      data.targetAmount = targetAmount
    }
    if (body.targetDate !== undefined) data.targetDate = toDt(body.targetDate) ?? null
    if (body.color !== undefined) data.color = toStr(body.color) || existing.color
    if (body.icon !== undefined) data.icon = toStr(body.icon) || existing.icon

    const updated = await db.savingsGoal.update({ where: { id }, data, include: includeDeposits })
    return NextResponse.json(savingsDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.savingsGoal.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('هدف پس‌انداز یافت نشد', 404)
    await db.savingsGoal.delete({ where: { id } }) // deposits cascade
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
