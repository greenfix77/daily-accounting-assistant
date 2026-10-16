import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const ACCOUNT_TYPES = ['BANK', 'CASH', 'SAVINGS', 'CUSTOM']

function computeBalance(
  id: string,
  initialBalance: number,
  txs: Array<{ type: string; amount: number; accountId: string; toAccountId: string | null }>,
) {
  let balance = initialBalance
  for (const t of txs) {
    if (t.accountId === id) {
      if (t.type === 'INCOME') balance += t.amount
      else if (t.type === 'EXPENSE') balance -= t.amount
      else if (t.type === 'TRANSFER') balance -= t.amount
    }
    if (t.type === 'TRANSFER' && t.toAccountId === id) balance += t.amount
  }
  return balance
}

export async function GET() {
  try {
    const [accounts, txs] = await Promise.all([
      db.account.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }),
      db.transaction.findMany({
        select: { type: true, amount: true, accountId: true, toAccountId: true },
      }),
    ])
    const dtos = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      icon: a.icon,
      initialBalance: a.initialBalance,
      isDefault: a.isDefault,
      balance: computeBalance(a.id, a.initialBalance, txs),
    }))
    return NextResponse.json(dtos)
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const name = toStr(body.name)?.trim()
    if (!name) return bad('نام حساب الزامی است')

    const type = typeof body.type === 'string' && body.type ? body.type : 'BANK'
    if (!ACCOUNT_TYPES.includes(type)) return bad('نوع حساب نامعتبر است')

    const initialBalance = toNum(body.initialBalance) ?? 0
    if (initialBalance < 0) return bad('موجودی اولیه نمی‌تواند منفی باشد')

    const count = await db.account.count()
    const created = await db.account.create({
      data: {
        name,
        type,
        color: toStr(body.color) || '#4E9B72',
        icon: toStr(body.icon) || 'landmark',
        initialBalance,
        isDefault: count === 0,
      },
    })
    return NextResponse.json({
      id: created.id,
      name: created.name,
      type: created.type,
      color: created.color,
      icon: created.icon,
      initialBalance: created.initialBalance,
      isDefault: created.isDefault,
      balance: initialBalance,
    })
  } catch (e) {
    return serverError(e)
  }
}
