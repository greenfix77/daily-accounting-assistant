import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, debtDTO, serverError, toDt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const DEBT_TYPES = ['OWED_TO_ME', 'I_OWE']

const includePayments = { payments: { orderBy: { date: 'desc' as const } } }

// GET /api/debts
export async function GET() {
  try {
    const rows = await db.debt.findMany({ include: includePayments })
    const dtos = rows.map((d) => debtDTO(d))
    dtos.sort((a, b) => {
      const au = a.status !== 'PAID'
      const bu = b.status !== 'PAID'
      if (au !== bu) return au ? -1 : 1
      if (au) {
        const ad = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER
        const bd = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER
        return ad - bd
      }
      return Date.parse(b.settledAt ?? '0') - Date.parse(a.settledAt ?? '0')
    })
    return NextResponse.json(dtos)
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/debts {person,type,amount,date?,dueDate?,notes?}
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const person = toStr(body.person)?.trim()
    if (!person) return bad('نام شخص الزامی است')
    const type = toStr(body.type) ?? ''
    if (!DEBT_TYPES.includes(type)) return bad('نوع بدهی باید OWED_TO_ME یا I_OWE باشد')
    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')

    const created = await db.debt.create({
      data: {
        person,
        type,
        amount,
        date: toDt(body.date) ?? new Date(),
        dueDate: toDt(body.dueDate) ?? null,
        notes: toStr(body.notes) || null,
      },
      include: includePayments,
    })
    return NextResponse.json(debtDTO(created))
  } catch (e) {
    return serverError(e)
  }
}
