import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError, startOfDay, toDt, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const REMINDER_TYPES = ['BILL', 'INSTALLMENT', 'DEBT', 'SAVINGS', 'CUSTOM']
const REPEATS = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']

type Ctx = { params: Promise<{ id: string }> }

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

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.reminder.findUnique({ where: { id } })
    if (!existing) return bad('یادآور یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: {
      title?: string
      type?: string
      date?: Date
      time?: string | null
      repeat?: string
      isDone?: boolean
    } = {}

    if (body.title !== undefined) {
      const title = toStr(body.title)?.trim()
      if (!title) return bad('عنوان یادآور الزامی است')
      data.title = title
    }
    if (body.type !== undefined) {
      const type = toStr(body.type) ?? ''
      if (!REMINDER_TYPES.includes(type)) return bad('نوع یادآور نامعتبر است')
      data.type = type
    }
    if (body.date !== undefined) {
      const date = toDt(body.date)
      if (!date) return bad('تاریخ نامعتبر است')
      data.date = date
    }
    if (body.time !== undefined) data.time = toStr(body.time) || null
    if (body.repeat !== undefined) {
      const repeat = toStr(body.repeat) ?? 'NONE'
      if (!REPEATS.includes(repeat)) return bad('تکرار نامعتبر است')
      data.repeat = repeat
    }
    if (body.isDone !== undefined) data.isDone = Boolean(body.isDone)

    const updated = await db.reminder.update({ where: { id }, data })
    return NextResponse.json(reminderDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.reminder.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('یادآور یافت نشد', 404)
    await db.reminder.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
