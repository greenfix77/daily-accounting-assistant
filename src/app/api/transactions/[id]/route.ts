import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { bad, serverError, toDt, toNum, toStr, txDTO, txInclude } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const TX_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER']

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const row = await db.transaction.findUnique({ where: { id }, include: txInclude })
    if (!row) return bad('تراکنش یافت نشد', 404)
    return NextResponse.json(txDTO(row))
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.transaction.findUnique({ where: { id }, include: txInclude })
    if (!existing) return bad('تراکنش یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: Prisma.TransactionUpdateInput = {}

    // type
    let type = existing.type
    if (body.type !== undefined) {
      if (typeof body.type !== 'string' || !TX_TYPES.includes(body.type))
        return bad('نوع تراکنش باید INCOME، EXPENSE یا TRANSFER باشد')
      type = body.type
      data.type = type
    }

    // amount
    if (body.amount !== undefined) {
      const amount = toNum(body.amount)
      if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')
      data.amount = amount
    }

    // accountId
    let accountId = existing.accountId
    if (body.accountId !== undefined) {
      if (typeof body.accountId !== 'string' || !body.accountId)
        return bad('حساب مبدأ الزامی است')
      const account = await db.account.findUnique({ where: { id: body.accountId } })
      if (!account) return bad('حساب مبدأ یافت نشد')
      accountId = account.id
      data.account = { connect: { id: account.id } }
    }

    // toAccountId
    let toAccountId = existing.toAccountId
    if (body.toAccountId !== undefined) {
      if (body.toAccountId === null || body.toAccountId === '') {
        toAccountId = null
        data.toAccount = { disconnect: true }
      } else if (typeof body.toAccountId === 'string') {
        const toAccount = await db.account.findUnique({ where: { id: body.toAccountId } })
        if (!toAccount) return bad('حساب مقصد یافت نشد')
        toAccountId = toAccount.id
        data.toAccount = { connect: { id: toAccount.id } }
      }
    }

    const finalType = type
    const finalAccountId = accountId
    const finalToAccountId = toAccountId
    if (finalType === 'TRANSFER') {
      if (!finalToAccountId) return bad('حساب مقصد برای انتقال الزامی است')
      if (finalToAccountId === finalAccountId)
        return bad('حساب مقصد نباید با حساب مبدأ یکسان باشد')
    } else if (finalToAccountId) {
      toAccountId = null
      data.toAccount = { disconnect: true }
    }

    // categoryId
    if (body.categoryId !== undefined) {
      if (body.categoryId === null || body.categoryId === '') {
        data.category = { disconnect: true }
      } else if (typeof body.categoryId === 'string') {
        const category = await db.category.findUnique({ where: { id: body.categoryId } })
        if (!category) return bad('دسته‌بندی یافت نشد')
        data.category = { connect: { id: category.id } }
      }
    }

    // text fields
    if (body.title !== undefined) data.title = toStr(body.title) || null
    if (body.description !== undefined) data.description = toStr(body.description) || null
    if (body.notes !== undefined) data.notes = toStr(body.notes) || null
    if (body.receiptUrl !== undefined) data.receiptUrl = toStr(body.receiptUrl) || null

    // date
    if (body.date !== undefined) {
      const date = toDt(body.date)
      if (!date) return bad('تاریخ نامعتبر است')
      data.date = date
    }

    const updated = await db.transaction.update({ where: { id }, data, include: txInclude })
    return NextResponse.json(txDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.transaction.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('تراکنش یافت نشد', 404)
    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
