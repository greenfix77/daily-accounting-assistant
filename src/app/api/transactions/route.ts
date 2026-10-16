import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { bad, serverError, toDt, toInt, toNum, toStr, txDTO, txInclude } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const TX_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER']

// GET /api/transactions?type=&q=&accountId=&categoryId=&from=&to=&sort=&limit=
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const type = sp.get('type') ?? undefined
    const q = sp.get('q') ?? undefined
    const accountId = sp.get('accountId') ?? undefined
    const categoryId = sp.get('categoryId') ?? undefined
    const from = toDt(sp.get('from'))
    const to = toDt(sp.get('to'))
    const sort = sp.get('sort') ?? 'date_desc'
    const limitRaw = toInt(sp.get('limit'))
    const limit = Math.min(Math.max(limitRaw ?? 200, 1), 500)

    const where: Prisma.TransactionWhereInput = {}
    if (type && TX_TYPES.includes(type)) where.type = type
    if (accountId) where.accountId = accountId
    if (categoryId === 'none') where.categoryId = null
    else if (categoryId) where.categoryId = categoryId
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { notes: { contains: q } },
      ]
    }
    if (from || to) {
      where.date = {
        ...(from ? { gte: from } : {}),
        // bare "YYYY-MM-DD" should include the whole end day
        ...(to && /^\d{4}-\d{2}-\d{2}$/.test(sp.get('to') ?? '')
          ? { lte: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) }
          : to
            ? { lte: to }
            : {}),
      }
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
      sort === 'date_asc'
        ? [{ date: 'asc' }, { createdAt: 'asc' }]
        : sort === 'amount_desc'
          ? [{ amount: 'desc' }, { date: 'desc' }]
          : sort === 'amount_asc'
            ? [{ amount: 'asc' }, { date: 'desc' }]
            : [{ date: 'desc' }, { createdAt: 'desc' }]

    const rows = await db.transaction.findMany({
      where,
      include: txInclude,
      orderBy,
      take: limit,
    })
    return NextResponse.json(rows.map(txDTO))
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))

    const type = typeof body.type === 'string' ? body.type : ''
    if (!TX_TYPES.includes(type)) return bad('نوع تراکنش باید INCOME، EXPENSE یا TRANSFER باشد')

    const amount = toNum(body.amount)
    if (amount === undefined || amount <= 0) return bad('مبلغ باید بزرگ‌تر از صفر باشد')

    const accountId = typeof body.accountId === 'string' && body.accountId ? body.accountId : null
    if (!accountId) return bad('حساب مبدأ الزامی است')
    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) return bad('حساب مبدأ یافت نشد')

    let toAccountId: string | null = null
    if (type === 'TRANSFER') {
      toAccountId = typeof body.toAccountId === 'string' && body.toAccountId ? body.toAccountId : null
      if (!toAccountId) return bad('حساب مقصد برای انتقال الزامی است')
      if (toAccountId === accountId) return bad('حساب مقصد نباید با حساب مبدأ یکسان باشد')
      const toAccount = await db.account.findUnique({ where: { id: toAccountId } })
      if (!toAccount) return bad('حساب مقصد یافت نشد')
    }

    let categoryId: string | null = null
    if (typeof body.categoryId === 'string' && body.categoryId) {
      const category = await db.category.findUnique({ where: { id: body.categoryId } })
      if (!category) return bad('دسته‌بندی یافت نشد')
      categoryId = category.id
    }

    const created = await db.transaction.create({
      data: {
        type,
        amount,
        title: toStr(body.title) || null,
        description: toStr(body.description) || null,
        notes: toStr(body.notes) || null,
        receiptUrl: toStr(body.receiptUrl) || null,
        accountId,
        toAccountId,
        categoryId,
        date: toDt(body.date) ?? new Date(),
      },
      include: txInclude,
    })
    return NextResponse.json(txDTO(created))
  } catch (e) {
    return serverError(e)
  }
}
