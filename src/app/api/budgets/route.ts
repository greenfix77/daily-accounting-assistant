import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  bad,
  budgetItemDTO,
  jalaliMonthKey,
  parseMonthKey,
  serverError,
  toNum,
} from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

// GET /api/budgets?month=YYYY-MM  (jalali key, default current)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const r = parseMonthKey(sp.get('month'))
    const [budgets, monthTxs] = await Promise.all([
      db.budget.findMany({ where: { month: r.key }, include: { category: true } }),
      db.transaction.findMany({
        where: { type: 'EXPENSE', date: { gte: r.start, lt: r.end } },
        select: { amount: true, categoryId: true },
      }),
    ])

    let overallSpent = 0
    for (const t of monthTxs) overallSpent += t.amount
    const overall = budgets.find((b) => !b.categoryId) ?? null

    const spentBy = new Map<string, number>()
    for (const t of monthTxs) {
      if (!t.categoryId) continue
      spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) + t.amount)
    }

    const items = budgets
      .filter((b) => b.categoryId)
      .map((b) => {
        const spent = spentBy.get(b.categoryId as string) ?? 0
        return {
          id: b.id,
          month: b.month,
          categoryId: b.categoryId,
          categoryName: b.category?.name ?? null,
          categoryIcon: b.category?.icon ?? null,
          categoryColor: b.category?.color ?? null,
          amount: b.amount,
          spent,
          percent: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
        }
      })
      .sort((a, b) => b.spent - a.spent)

    return NextResponse.json({
      month: r.key,
      total: overall?.amount ?? 0,
      items,
      overallSpent,
    })
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/budgets {month?, categoryId|null, amount} → upsert by (month, categoryId)
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const month =
      typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month.trim())
        ? body.month.trim()
        : jalaliMonthKey(new Date())
    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ بودجه باید بزرگ‌تر از صفر باشد')

    let categoryId: string | null = null
    if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== '') {
      if (typeof body.categoryId !== 'string') return bad('دسته‌بندی نامعتبر است')
      const category = await db.category.findUnique({ where: { id: body.categoryId } })
      if (!category) return bad('دسته‌بندی یافت نشد')
      categoryId = category.id
    }

    const existing = await db.budget.findFirst({ where: { month, categoryId } })
    const budget = existing
      ? await db.budget.update({ where: { id: existing.id }, data: { amount }, include: { category: true } })
      : await db.budget.create({ data: { month, categoryId, amount }, include: { category: true } })

    return NextResponse.json(await budgetItemDTO(budget))
  } catch (e) {
    return serverError(e)
  }
}
