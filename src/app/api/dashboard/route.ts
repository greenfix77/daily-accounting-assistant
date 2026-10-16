import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  addDays,
  dayDiff,
  jalaliMonthKey,
  jalaliMonthRange,
  nextDue,
  serverError,
  startOfDay,
  txDTO,
} from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export async function GET() {
  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const tomorrow = addDays(todayStart, 1)
    const month = jalaliMonthRange(now)
    const monthKey = jalaliMonthKey(now)

    const [accounts, txs, budgets, debts, recurrings, reminders, goalRows] = await Promise.all([
      db.account.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }),
      db.transaction.findMany({
        include: { account: true, toAccount: true, category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      db.budget.findMany({ where: { month: monthKey } }),
      db.debt.findMany(),
      db.recurring.findMany(),
      db.reminder.findMany(),
      db.savingsGoal.findMany({ include: { deposits: true } }),
    ])

    // ---- balances ----
    const totalBalance =
      accounts.reduce((s, a) => s + a.initialBalance, 0) +
      txs.reduce(
        (s, t) => (t.type === 'INCOME' ? s + t.amount : t.type === 'EXPENSE' ? s - t.amount : s),
        0,
      )

    // ---- today / month sums ----
    let todayIncome = 0
    let todayExpense = 0
    let monthIncome = 0
    let monthExpense = 0
    for (const t of txs) {
      if (t.type === 'INCOME' || t.type === 'EXPENSE') {
        const ts = t.date.getTime()
        if (ts >= todayStart.getTime() && ts < tomorrow.getTime()) {
          if (t.type === 'INCOME') todayIncome += t.amount
          else todayExpense += t.amount
        }
        if (ts >= month.start.getTime() && ts < month.end.getTime()) {
          if (t.type === 'INCOME') monthIncome += t.amount
          else monthExpense += t.amount
        }
      }
    }

    // ---- overall budget ----
    const overall = budgets.find((b) => !b.categoryId) ?? null
    const budget = overall
      ? {
          total: overall.amount,
          spent: monthExpense,
          percent: overall.amount > 0 ? Math.round((monthExpense / overall.amount) * 100) : 0,
        }
      : null

    // ---- last 7 days (oldest → newest, including today) ----
    const week: Array<{ date: string; income: number; expense: number }> = []
    for (let i = 6; i >= 0; i--) {
      const day = addDays(todayStart, -i)
      const next = addDays(day, 1)
      let income = 0
      let expense = 0
      for (const t of txs) {
        if (t.type !== 'INCOME' && t.type !== 'EXPENSE') continue
        const ts = t.date.getTime()
        if (ts >= day.getTime() && ts < next.getTime()) {
          if (t.type === 'INCOME') income += t.amount
          else expense += t.amount
        }
      }
      week.push({
        date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`,
        income,
        expense,
      })
    }

    // ---- recent transactions ----
    const recent = txs.slice(0, 6).map(txDTO)

    // ---- upcoming (next 5 within 30 days) ----
    type Upcoming = {
      id: string
      title: string
      amount: number | null
      date: string
      kind: 'RECURRING' | 'DEBT' | 'REMINDER'
      daysLeft: number
    }
    const upcoming: Upcoming[] = []
    for (const r of recurrings) {
      const nd = nextDue(r)
      if (!nd) continue
      const dl = dayDiff(nd, todayStart)
      if (dl < 0 || dl > 30) continue
      upcoming.push({
        id: r.id,
        title: r.title,
        amount: r.amount,
        date: nd.toISOString(),
        kind: 'RECURRING',
        daysLeft: dl,
      })
    }
    for (const d of debts) {
      if (d.paidAmount >= d.amount || !d.dueDate) continue
      const dl = dayDiff(d.dueDate, todayStart)
      if (dl < 0 || dl > 30) continue
      upcoming.push({
        id: d.id,
        title: d.person,
        amount: Math.max(0, d.amount - d.paidAmount),
        date: d.dueDate.toISOString(),
        kind: 'DEBT',
        daysLeft: dl,
      })
    }
    for (const r of reminders) {
      if (r.isDone) continue
      const dl = dayDiff(r.date, todayStart)
      if (dl < 0 || dl > 30) continue
      upcoming.push({
        id: r.id,
        title: r.title,
        amount: null,
        date: r.date.toISOString(),
        kind: 'REMINDER',
        daysLeft: dl,
      })
    }
    upcoming.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))

    // ---- debts summary (unsettled only) ----
    const debtsSummary = { owedToMe: 0, iOwe: 0 }
    for (const d of debts) {
      if (d.paidAmount >= d.amount) continue
      const remaining = Math.max(0, d.amount - d.paidAmount)
      if (d.type === 'OWED_TO_ME') debtsSummary.owedToMe += remaining
      else debtsSummary.iOwe += remaining
    }

    // ---- goals (top 3 by percent) ----
    const goals = goalRows
      .map((g) => {
        const current = g.deposits.reduce((s, d) => s + d.amount, 0)
        const percent =
          g.targetAmount > 0 ? Math.min(100, Math.round((current / g.targetAmount) * 100)) : 0
        return { id: g.id, name: g.name, percent, current, target: g.targetAmount, color: g.color }
      })
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3)

    return NextResponse.json({
      totalBalance,
      todayIncome,
      todayExpense,
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      budget,
      week,
      recent,
      upcoming: upcoming.slice(0, 5),
      debts: debtsSummary,
      goals,
    })
  } catch (e) {
    return serverError(e)
  }
}
