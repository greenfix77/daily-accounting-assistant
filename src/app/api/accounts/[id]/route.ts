import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const ACCOUNT_TYPES = ['BANK', 'CASH', 'SAVINGS', 'CUSTOM']

type Ctx = { params: Promise<{ id: string }> }

async function accountDTO(id: string) {
  const [account, txs] = await Promise.all([
    db.account.findUnique({ where: { id } }),
    db.transaction.findMany({
      where: { OR: [{ accountId: id }, { toAccountId: id }] },
      select: { type: true, amount: true, accountId: true, toAccountId: true },
    }),
  ])
  if (!account) return null
  let balance = account.initialBalance
  for (const t of txs) {
    if (t.accountId === id) {
      if (t.type === 'INCOME') balance += t.amount
      else if (t.type === 'EXPENSE') balance -= t.amount
      else if (t.type === 'TRANSFER') balance -= t.amount
    }
    if (t.type === 'TRANSFER' && t.toAccountId === id) balance += t.amount
  }
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    icon: account.icon,
    initialBalance: account.initialBalance,
    isDefault: account.isDefault,
    balance,
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const dto = await accountDTO(id)
    if (!dto) return bad('حساب یافت نشد', 404)
    return NextResponse.json(dto)
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) return bad('حساب یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: { name?: string; type?: string; color?: string; icon?: string; initialBalance?: number } = {}

    if (body.name !== undefined) {
      const name = toStr(body.name)?.trim()
      if (!name) return bad('نام حساب الزامی است')
      data.name = name
    }
    if (body.type !== undefined) {
      const type = toStr(body.type) ?? ''
      if (!ACCOUNT_TYPES.includes(type)) return bad('نوع حساب نامعتبر است')
      data.type = type
    }
    if (body.color !== undefined) data.color = toStr(body.color) || existing.color
    if (body.icon !== undefined) data.icon = toStr(body.icon) || existing.icon
    if (body.initialBalance !== undefined) {
      const initialBalance = toNum(body.initialBalance)
      if (initialBalance === undefined || initialBalance < 0)
        return bad('موجودی اولیه نمی‌تواند منفی باشد')
      data.initialBalance = initialBalance
    }

    await db.account.update({ where: { id }, data })
    const dto = await accountDTO(id)
    return NextResponse.json(dto)
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.account.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('حساب یافت نشد', 404)

    const count = await db.transaction.count({ where: { accountId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: 'این حساب تراکنش دارد و قابل حذف نیست' },
        { status: 409 },
      )
    }
    await db.account.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
