import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError, startOfDay, toDt, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const REMINDER_TYPES = ['BILL', 'INSTALLMENT', 'DEBT', 'SAVINGS', 'CUSTOM']
const REPEATS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

function reminderDTO(r: {
  id: string
  title: string
  type: string
  date: Date
  time: string | null
  repeat: string
  isDone: boolean
}) {
  const todayStart = startOfDay(new Date())
  const daysLeft = Math.ceil((startOfDay(r.date).getTime() - todayStart.getTime()) / 86_400_000)
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date.toISOString(),
    time: r.time,
    repeat: r.repeat,
    isDone: r.isDone,
    daysLeft,
  }
}

// GET /api/reminders?pending=1
export async function GET(req: NextRequest) {
  try {
    const pending = req.nextUrl.searchParams.get('pending') === '1'
    const rows = await db.reminder.findMany({
      where: pending ? { isDone: false } : undefined,
    })
    const dtos = rows.map(reminderDTO)
    dtos.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
      if (!a.isDone) return Date.parse(a.date) - Date.parse(b.date)
      return Date.parse(b.date) - Date.parse(a.date)
    })
    return NextResponse.json(dtos)
  } catch (e) {
    return serverError(e)
  }
}

// POST /api/reminders {title,type,date,time?,repeat?}
export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const title = toStr(body.title)?.trim()
    if (!title) return bad('عنوان یادآور الزامی است')
    const date = toDt(body.date)
    if (!date) return bad('تاریخ یادآور الزامی است')

    const type = toStr(body.type) ?? 'CUSTOM'
    if (!REMINDER_TYPES.includes(type)) return bad('نوع یادآور نامعتبر است')
    const repeat = toStr(body.repeat) ?? 'NONE'
    if (!REPEATS.includes(repeat)) return bad('تکرار نامعتبر است')

    const created = await db.reminder.create({
      data: {
        title,
        type,
        date,
        time: toStr(body.time) || null,
        repeat,
      },
    })
    return NextResponse.json(reminderDTO(created))
  } catch (e) {
    return serverError(e)
  }
}
