import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, recInclude, recurDTO, serverError, toDt, toInt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const REC_TYPES = ['EXPENSE', 'INCOME']
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const row = await db.recurring.findUnique({ where: { id }, include: recInclude })
    if (!row) return bad('قسط/درآمد تکرارشونده یافت نشد', 404)
    return NextResponse.json(recurDTO(row))
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.recurring.findUnique({ where: { id } })
    if (!existing) return bad('قسط/درآمد تکرارشونده یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: {
      title?: string
      type?: string
      amount?: number
      accountId?: string
      categoryId?: string | null
      frequency?: string
      startDate?: Date
      endDate?: Date | null
      totalCount?: number | null
      isActive?: boolean
    } = {}

    if (body.title !== undefined) {
      const title = toStr(body.title)?.trim()
      if (!title) return bad('عنوان الزامی است')
      data.title = title
    }
    if (body.type !== undefined) {
      const type = toStr(body.type) ?? ''
      if (!REC_TYPES.includes(type)) return bad('نوع باید EXPENSE یا INCOME باشد')
      data.type = type
    }
    if (body.amount !== undefined) {
      const amount = toNum(body.amount)
      if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')
      data.amount = amount
    }
    if (body.accountId !== undefined) {
      const accountId = toStr(body.accountId) ?? ''
      if (!accountId) return bad('حساب الزامی است')
      const account = await db.account.findUnique({ where: { id: accountId } })
      if (!account) return bad('حساب یافت نشد')
      data.accountId = accountId
    }
    if (body.categoryId !== undefined) {
      if (body.categoryId === null || body.categoryId === '') {
        data.categoryId = null
      } else if (typeof body.categoryId === 'string') {
        const category = await db.category.findUnique({ where: { id: body.categoryId } })
        if (!category) return bad('دسته‌بندی یافت نشد')
        data.categoryId = category.id
      }
    }
    if (body.frequency !== undefined) {
      const frequency = toStr(body.frequency) ?? ''
      if (!FREQUENCIES.includes(frequency)) return bad('تناوب نامعتبر است')
      data.frequency = frequency
    }
    if (body.startDate !== undefined) {
      const startDate = toDt(body.startDate)
      if (!startDate) return bad('تاریخ شروع نامعتبر است')
      data.startDate = startDate
    }
    if (body.endDate !== undefined) data.endDate = toDt(body.endDate) ?? null
    if (body.totalCount !== undefined) {
      if (body.totalCount === null || body.totalCount === '') {
        data.totalCount = null
      } else {
        const tc = toInt(body.totalCount)
        if (tc === undefined || tc < 1) return bad('تعداد کل باید حداقل ۱ باشد')
        data.totalCount = tc
      }
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive)

    const updated = await db.recurring.update({ where: { id }, data, include: recInclude })
    return NextResponse.json(recurDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.recurring.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('قسط/درآمد تکرارشونده یافت نشد', 404)
    await db.recurring.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
