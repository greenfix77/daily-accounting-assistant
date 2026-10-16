import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, recInclude, recurDTO, serverError, toDt, toInt, toNum, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const REC_TYPES = ['EXPENSE', 'INCOME']
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

// GET /api/recurring
export async function GET() {
  try {
    const rows = await db.recurring.findMany({ include: recInclude, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(rows.map(recurDTO))
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/recurring {title,type,amount,accountId,categoryId?,frequency,startDate?,endDate?,totalCount?}
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const title = toStr(body.title)?.trim()
    if (!title) return bad('عنوان الزامی است')
    const type = toStr(body.type) ?? 'EXPENSE'
    if (!REC_TYPES.includes(type)) return bad('نوع باید EXPENSE یا INCOME باشد')
    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')

    const accountId = toStr(body.accountId) ?? ''
    if (!accountId) return bad('حساب الزامی است')
    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) return bad('حساب یافت نشد')

    let categoryId: string | null = null
    if (typeof body.categoryId === 'string' && body.categoryId) {
      const category = await db.category.findUnique({ where: { id: body.categoryId } })
      if (!category) return bad('دسته‌بندی یافت نشد')
      categoryId = category.id
    }

    const frequency = toStr(body.frequency) ?? 'MONTHLY'
    if (!FREQUENCIES.includes(frequency)) return bad('تناوب نامعتبر است')

    const startDate = toDt(body.startDate) ?? new Date()
    let totalCount: number | null = null
    if (body.totalCount !== undefined && body.totalCount !== null && body.totalCount !== '') {
      const tc = toInt(body.totalCount)
      if (tc === undefined || tc < 1) return bad('تعداد کل باید حداقل ۱ باشد')
      totalCount = tc
    }

    const created = await db.recurring.create({
      data: {
        title,
        type,
        amount,
        accountId,
        categoryId,
        frequency,
        startDate,
        endDate: toDt(body.endDate) ?? null,
        totalCount,
      },
      include: recInclude,
    })
    return NextResponse.json(recurDTO(created))
  } catch (e) {
    return serverError(e)
  }
}
