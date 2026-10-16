import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serverError, toDt } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const TYPE_FA: Record<string, string> = {
  INCOME: 'درآمد',
  EXPENSE: 'هزینه',
  TRANSFER: 'انتقال',
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
}

// GET /api/export?from=ISO&to=ISO → CSV (UTF-8 with BOM)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const from = toDt(sp.get('from'))
    const to = toDt(sp.get('to'))

    const rows = await db.transaction.findMany({
      where: from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : undefined,
      include: { account: true, toAccount: true, category: true },
      orderBy: { date: 'asc' },
    })

    const header = 'نوع,عنوان,مبلغ,حساب,دسته,تاریخ,توضیحات'
    const lines = rows.map((t) => {
      const account =
        t.type === 'TRANSFER' && t.toAccount ? `${t.account.name} → ${t.toAccount.name}` : t.account.name
      const cells = [
        TYPE_FA[t.type] ?? t.type,
        t.title ?? '',
        String(t.amount),
        account,
        t.category?.name ?? '',
        t.date.toISOString(),
        t.description ?? t.notes ?? '',
      ]
      return cells.map(csvEscape).join(',')
    })

    // \uFEFF BOM so Excel opens Persian text correctly
    const csv = '\uFEFF' + header + '\n' + lines.join('\n') + (lines.length ? '\n' : '')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="transactions.csv"',
      },
    })
  } catch (e) {
    return serverError(e)
  }
}
