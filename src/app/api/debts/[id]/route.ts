import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, debtDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const includePayments = { payments: { orderBy: { date: 'desc' as const } } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const row = await db.debt.findUnique({ where: { id }, include: includePayments })
    if (!row) return bad('بدهی یافت نشد', 404)
    return NextResponse.json(debtDTO(row))
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.debt.findUnique({ where: { id } })
    if (!existing) return bad('بدهی یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: {
      person?: string
      amount?: number
      dueDate?: Date | null
      notes?: string | null
    } = {}

    if (body.person !== undefined) {
      const person = toStr(body.person)?.trim()
      if (!person) return bad('نام شخص الزامی است')
      data.person = person
    }
    if (body.amount !== undefined) {
      const amount = toNum(body.amount)
      if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')
      data.amount = amount
    }
    if (body.dueDate !== undefined) data.dueDate = toDt(body.dueDate) ?? null
    if (body.notes !== undefined) data.notes = toStr(body.notes) || null

    const updated = await db.debt.update({ where: { id }, data, include: includePayments })
    return NextResponse.json(debtDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.debt.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('بدهی یافت نشد', 404)
    await db.debt.delete({ where: { id } }) // payments cascade
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
