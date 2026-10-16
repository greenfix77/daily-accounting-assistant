import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  addDays,
  endOfDay,
  serverError,
  startOfDay,
  toGregorian,
  toInt,
  toJalali,
} from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function jMonthRange(jy: number, jm: number) {
  const start = toGregorian(jy, jm, 1)
  const nm = jm === 12 ? 1 : jm + 1
  const ny = jm === 12 ? jy + 1 : jy
  const end = toGregorian(ny, nm, 1)
  return { start, end }
}

function shiftJalali(jy: number, jm: number, delta: number) {
  let m = jm + delta
  let y = jy
  while (m <= 0) {
    m += 12
    y -= 1
  }
  while (m > 12) {
    m -= 12
    y += 1
  }
  return { jy: y, jm: m }
}

// GET /api/reports?period=weekly|monthly|yearly&offset=0
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const periodRaw = sp.get('period') ?? 'monthly'
    const period = ['daily', 'weekly', 'monthly', 'yearly'].includes(periodRaw) ? periodRaw : 'monthly'
    const offset = Math.max(0, toInt(sp.get('offset')) ?? 0)
    const now = new Date()
    const todayStart = startOfDay(now)

    let from: Date
    let to: Date
    let seriesFrom: Date
    const months: Array<{ jy: number; jm: number }> = []
    const days: Date[] = []
    const years: number[] = []

    if (period === 'daily') {
      from = startOfDay(now)
      to = endOfDay(now)
      seriesFrom = startOfDay(addDays(todayStart, -6))
      for (let i = 6; i >= 0; i--) days.push(addDays(todayStart, -i))
    } else if (period === 'weekly') {
      const endDay = addDays(todayStart, -offset * 7)
      to = endOfDay(endDay)
      from = startOfDay(addDays(endDay, -6))
      seriesFrom = from
      for (let i = 6; i >= 0; i--) days.push(addDays(endDay, -i))
    } else if (period === 'monthly') {
      const j = toJalali(todayStart)
      const anchor = shiftJalali(j.jy, j.jm, -offset)
      const anchorRange = jMonthRange(anchor.jy, anchor.jm)
      from = anchorRange.start
      to = endOfDay(addDays(anchorRange.end, -1))
      const start6 = shiftJalali(anchor.jy, anchor.jm, -5)
      seriesFrom = jMonthRange(start6.jy, start6.jm).start
      for (let i = 5; i >= 0; i--) months.push(shiftJalali(anchor.jy, anchor.jm, -i))
    } else {
      const y = now.getFullYear() - offset
      from = new Date(y, 0, 1, 0, 0, 0, 0)
      to = new Date(y, 11, 31, 23, 59, 59, 999)
      seriesFrom = new Date(y - 2, 0, 1, 0, 0, 0, 0)
      for (let i = 2; i >= 0; i--) years.push(y - i)
    }

    const [txs, accounts] = await Promise.all([
      db.transaction.findMany({
        where: {
          date: { gte: seriesFrom, lte: to },
          type: { in: ['INCOME', 'EXPENSE'] },
        },
        include: {
          account: { select: { name: true, color: true } },
          category: { select: { name: true, color: true } },
        },
      }),
      db.account.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

    const inRange = txs.filter((t) => t.date.getTime() >= from.getTime() && t.date.getTime() <= to.getTime())
    let income = 0
    let expense = 0
    for (const t of inRange) {
      if (t.type === 'INCOME') income += t.amount
      else expense += t.amount
    }

    // ---- series ----
    const series: Array<{ label: string; income: number; expense: number }> = []
    if (period === 'monthly') {
      for (const m of months) {
        const r = jMonthRange(m.jy, m.jm)
        let si = 0
        let se = 0
        for (const t of txs) {
          const ts = t.date.getTime()
          if (ts < r.start.getTime() || ts >= r.end.getTime()) continue
          if (t.type === 'INCOME') si += t.amount
          else se += t.amount
        }
        series.push({ label: `${m.jy}-${pad(m.jm)}`, income: si, expense: se })
      }
    } else if (period === 'daily' || period === 'weekly') {
      for (const d of days) {
        const next = addDays(d, 1)
        let si = 0
        let se = 0
        for (const t of txs) {
          const ts = t.date.getTime()
          if (ts < d.getTime() || ts >= next.getTime()) continue
          if (t.type === 'INCOME') si += t.amount
          else se += t.amount
        }
        series.push({
          label: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          income: si,
          expense: se,
        })
      }
    } else {
      for (const y of years) {
        const s = new Date(y, 0, 1)
        const e = new Date(y + 1, 0, 1)
        let si = 0
        let se = 0
        for (const t of txs) {
          const ts = t.date.getTime()
          if (ts < s.getTime() || ts >= e.getTime()) continue
          if (t.type === 'INCOME') si += t.amount
          else se += t.amount
        }
        const labelJy = toJalali(new Date(y, 6, 1)).jy // dominant jalali year of that gregorian year
        series.push({ label: String(labelJy), income: si, expense: se })
      }
    }

    // ---- category breakdowns (range only, categorized txs) ----
    const breakdown = (type: 'INCOME' | 'EXPENSE') => {
      const map = new Map<string, { categoryId: string; name: string; color: string; total: number }>()
      let sum = 0
      for (const t of inRange) {
        if (t.type !== type || !t.categoryId) continue
        sum += t.amount
        const entry = map.get(t.categoryId)
        if (entry) entry.total += t.amount
        else
          map.set(t.categoryId, {
            categoryId: t.categoryId,
            name: t.category?.name ?? 'بدون نام',
            color: t.category?.color ?? '#4E9B72',
            total: t.amount,
          })
      }
      return [...map.values()]
        .map((e) => ({ ...e, percent: sum > 0 ? Math.round((e.total / sum) * 100) : 0 }))
        .sort((a, b) => b.total - a.total)
    }

    // ---- per-account totals (range only) ----
    const accountRows = accounts.map((a) => {
      let ai = 0
      let ae = 0
      for (const t of inRange) {
        if (t.accountId !== a.id) continue
        if (t.type === 'INCOME') ai += t.amount
        else if (t.type === 'EXPENSE') ae += t.amount
      }
      return { accountId: a.id, name: a.name, color: a.color, income: ai, expense: ae }
    })

    return NextResponse.json({
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      income,
      expense,
      net: income - expense,
      series,
      categories: breakdown('EXPENSE'),
      incomeCategories: breakdown('INCOME'),
      accounts: accountRows,
    })
  } catch (e) {
    return serverError(e)
  }
}
