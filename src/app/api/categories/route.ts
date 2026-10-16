import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  jalaliMonthRange,
  serverError,
  toStr,
} from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const CATEGORY_TYPES = ['INCOME', 'EXPENSE']

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type') ?? undefined
    const stats = sp.get('stats') === '1'

    const where = type && CATEGORY_TYPES.includes(type) ? { type } : undefined
    const categories = await db.category.findMany({ where, orderBy: [{ type: 'asc' }, { createdAt: 'asc' }] })

    if (!stats) {
      return NextResponse.json(
        categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          isDefault: c.isDefault,
        })),
      )
    }

    const month = jalaliMonthRange(new Date())
    const [monthSums, counts] = await Promise.all([
      db.transaction.groupBy({
        by: ['categoryId'],
        where: { type: 'EXPENSE', date: { gte: month.start, lt: month.end }, categoryId: { not: null } },
        _sum: { amount: true },
      }),
      db.transaction.groupBy({
        by: ['categoryId'],
        where: { categoryId: { not: null } },
        _count: { _all: true },
      }),
    ])
    const spentBy = new Map<string, number>()
    for (const g of monthSums) if (g.categoryId) spentBy.set(g.categoryId, g._sum.amount ?? 0)
    const countBy = new Map<string, number>()
    for (const g of counts) if (g.categoryId) countBy.set(g.categoryId, g._count._all)

    return NextResponse.json(
      categories.map((c) => {
        const base: {
          id: string
          name: string
          type: string
          icon: string
          color: string
          isDefault: boolean
          spent?: number
          count?: number
        } = {
          id: c.id,
          name: c.name,
          type: c.type,
          icon: c.icon,
          color: c.color,
          isDefault: c.isDefault,
          count: countBy.get(c.id) ?? 0,
        }
        if (c.type === 'EXPENSE') base.spent = spentBy.get(c.id) ?? 0
        return base
      }),
    )
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const name = toStr(body.name)?.trim()
    if (!name) return NextResponse.json({ error: 'نام دسته‌بندی الزامی است' }, { status: 400 })
    const type = toStr(body.type) ?? ''
    if (!CATEGORY_TYPES.includes(type))
      return NextResponse.json({ error: 'نوع دسته‌بندی باید INCOME یا EXPENSE باشد' }, { status: 400 })

    const created = await db.category.create({
      data: {
        name,
        type,
        icon: toStr(body.icon) || 'tag',
        color: toStr(body.color) || '#4E9B72',
      },
    })
    return NextResponse.json({
      id: created.id,
      name: created.name,
      type: created.type,
      icon: created.icon,
      color: created.color,
      isDefault: created.isDefault,
    })
  } catch (e) {
    return serverError(e)
  }
}
