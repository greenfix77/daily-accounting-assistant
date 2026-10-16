// Shared server-side helpers for all API routes (private folder — not routable).
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export { toJalali, toGregorian, jalaliMonthKey, jalaliMonthRange } from '@/lib/jalali-core'
import { toGregorian, jalaliMonthKey } from '@/lib/jalali-core'

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  const day = x.getDate()
  x.setMonth(x.getMonth() + n)
  if (x.getDate() < day) x.setDate(0) // clamp overflow (e.g. Jan 31 → Feb 28)
  return x
}

export function addYears(d: Date, n: number): Date {
  const x = new Date(d)
  x.setFullYear(x.getFullYear() + n)
  return x
}

/** Days from `from` (default: today start) to target day. Today → 0. */
export function dayDiff(target: Date, from?: Date): number {
  const base = from ?? startOfDay(new Date())
  return Math.ceil((startOfDay(target).getTime() - base.getTime()) / 86_400_000)
}

/** Parse "1403-07" jalali month key → {key, jy, jm, start, end}. Falls back to current month. */
export function parseMonthKey(key: string | null | undefined) {
  const k = key && /^\d{4}-\d{2}$/.test(key.trim()) ? key.trim() : jalaliMonthKey(new Date())
  const [jy, jm] = k.split('-').map((v) => parseInt(v, 10))
  const start = toGregorian(jy, jm, 1)
  const nm = jm === 12 ? 1 : jm + 1
  const ny = jm === 12 ? jy + 1 : jy
  const end = toGregorian(ny, nm, 1)
  return { key: k, jy, jm, start, end }
}

// ---------------------------------------------------------------------------
// Body coercion helpers
// ---------------------------------------------------------------------------
export function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? n : undefined
}

export function toInt(v: unknown): number | undefined {
  const n = toNum(v)
  return n === undefined ? undefined : Math.trunc(n)
}

export function toStr(v: unknown): string | undefined {
  if (v === undefined) return undefined
  if (v === null) return ''
  return String(v)
}

/** Accepts ISO strings, timestamps or plain "YYYY-MM-DD" (treated as local noon). */
export function toDt(v: unknown): Date | undefined {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) {
    const [y, m, d] = v.split('-').map((x) => parseInt(x, 10))
    const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
    return isNaN(dt.getTime()) ? undefined : dt
  }
  const d = new Date(v as string | number)
  return isNaN(d.getTime()) ? undefined : d
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function serverError(e: unknown) {
  console.error('[api]', e)
  return NextResponse.json({ error: 'خطای غیرمنتظره سرور' }, { status: 500 })
}

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------
export type TxRow = Prisma.TransactionGetPayload<{
  include: { account: true; toAccount: true; category: true }
}>

export const txInclude = { account: true, toAccount: true, category: true } as const

export function txDTO(tx: TxRow) {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    title: tx.title,
    description: tx.description,
    notes: tx.notes,
    receiptUrl: tx.receiptUrl,
    accountId: tx.accountId,
    accountName: tx.account?.name ?? null,
    toAccountId: tx.toAccountId,
    toAccountName: tx.toAccount?.name ?? null,
    categoryId: tx.categoryId,
    categoryName: tx.category?.name ?? null,
    categoryColor: tx.category?.color ?? null,
    categoryIcon: tx.category?.icon ?? null,
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Recurring → nextDue
// ---------------------------------------------------------------------------
export type RecurringLike = {
  frequency: string
  startDate: Date
  endDate: Date | null
  totalCount: number | null
  paidCount: number
  lastPaidAt: Date | null
  isActive: boolean
}

function stepDate(d: Date, frequency: string): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(d, 1)
    case 'WEEKLY':
      return addDays(d, 7)
    case 'YEARLY':
      return addYears(d, 1)
    default:
      return addMonths(d, 1)
  }
}

/** Earliest occurrence of the schedule strictly after max(lastPaidAt, startDate−1s). */
export function nextDue(r: RecurringLike): Date | null {
  if (!r.isActive) return null
  if (r.totalCount != null && r.paidCount >= r.totalCount) return null
  const last = r.lastPaidAt ? r.lastPaidAt.getTime() : -Infinity
  const reference = Math.max(last, r.startDate.getTime() - 1000)
  let cur = new Date(r.startDate.getTime())
  let guard = 0
  while (cur.getTime() <= reference && guard < 5000) {
    cur = stepDate(cur, r.frequency)
    guard += 1
  }
  if (guard >= 5000) return null
  if (r.endDate && cur.getTime() > r.endDate.getTime()) return null
  return cur
}

export type RecRow = Prisma.RecurringGetPayload<{ include: { account: true; category: true } }>

export const recInclude = { account: true, category: true } as const

export function recurDTO(r: RecRow) {
  const nd = nextDue(r)
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    amount: r.amount,
    accountId: r.accountId,
    accountName: r.account?.name ?? null,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    categoryIcon: r.category?.icon ?? null,
    categoryColor: r.category?.color ?? null,
    frequency: r.frequency,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate ? r.endDate.toISOString() : null,
    totalCount: r.totalCount,
    paidCount: r.paidCount,
    lastPaidAt: r.lastPaidAt ? r.lastPaidAt.toISOString() : null,
    isActive: r.isActive,
    nextDue: nd ? nd.toISOString() : null,
  }
}

// ---------------------------------------------------------------------------
// Budget item DTO (with spent for its own jalali month)
// ---------------------------------------------------------------------------
export type BudgetRow = Prisma.BudgetGetPayload<{ include: { category: true } }>

export async function budgetItemDTO(b: BudgetRow) {
  const r = parseMonthKey(b.month)
  const agg = await db.transaction.aggregate({
    where: {
      type: 'EXPENSE',
      date: { gte: r.start, lt: r.end },
      ...(b.categoryId ? { categoryId: b.categoryId } : {}),
    },
    _sum: { amount: true },
  })
  const spent = agg._sum.amount ?? 0
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
}

// ---------------------------------------------------------------------------
// Debt DTO
// ---------------------------------------------------------------------------
export type DebtRow = Prisma.DebtGetPayload<{ include: { payments: true } }>

export function debtDTO(d: DebtRow, paymentsDesc = true) {
  const todayStart = startOfDay(new Date())
  const remaining = Math.max(0, d.amount - d.paidAmount)
  let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING'
  if (d.paidAmount >= d.amount) status = 'PAID'
  else if (d.dueDate && d.dueDate.getTime() < todayStart.getTime()) status = 'OVERDUE'
  const payments = [...d.payments]
    .sort((a, b) => (paymentsDesc ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime()))
    .map((p) => ({ id: p.id, amount: p.amount, date: p.date.toISOString(), notes: p.notes }))
  return {
    id: d.id,
    person: d.person,
    type: d.type,
    amount: d.amount,
    paidAmount: d.paidAmount,
    remaining,
    date: d.date.toISOString(),
    dueDate: d.dueDate ? d.dueDate.toISOString() : null,
    notes: d.notes,
    status,
    settledAt: d.settledAt ? d.settledAt.toISOString() : null,
    payments,
  }
}

// ---------------------------------------------------------------------------
// Savings goal DTO
// ---------------------------------------------------------------------------
export type SavingsGoalRow = Prisma.SavingsGoalGetPayload<{ include: { deposits: true } }>

export function savingsDTO(g: SavingsGoalRow) {
  const current = g.deposits.reduce((s, d) => s + d.amount, 0)
  const percent = g.targetAmount > 0 ? Math.min(100, Math.round((current / g.targetAmount) * 100)) : 0
  return {
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
    color: g.color,
    icon: g.icon,
    current,
    percent,
    deposits: [...g.deposits]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((d) => ({ id: d.id, amount: d.amount, date: d.date.toISOString(), notes: d.notes })),
  }
}
