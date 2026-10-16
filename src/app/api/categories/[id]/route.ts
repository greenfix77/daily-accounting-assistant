import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bad, serverError, toStr } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

const CATEGORY_TYPES = ['INCOME', 'EXPENSE']

type Ctx = { params: Promise<{ id: string }> }

function categoryDTO(c: {
  id: string
  name: string
  type: string
  icon: string
  color: string
  isDefault: boolean
}) {
  return { id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color, isDefault: c.isDefault }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) return bad('دسته‌بندی یافت نشد', 404)

    const body: Record<string, unknown> = await req.json().catch(() => ({}))
    const data: { name?: string; type?: string; icon?: string; color?: string } = {}
    if (body.name !== undefined) {
      const name = toStr(body.name)?.trim()
      if (!name) return bad('نام دسته‌بندی الزامی است')
      data.name = name
    }
    if (body.type !== undefined) {
      const type = toStr(body.type) ?? ''
      if (!CATEGORY_TYPES.includes(type)) return bad('نوع دسته‌بندی نامعتبر است')
      data.type = type
    }
    if (body.icon !== undefined) data.icon = toStr(body.icon) || existing.icon
    if (body.color !== undefined) data.color = toStr(body.color) || existing.color

    const updated = await db.category.update({ where: { id }, data })
    return NextResponse.json(categoryDTO(updated))
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const existing = await db.category.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return bad('دسته‌بندی یافت نشد', 404)

    const count = await db.transaction.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: 'این دسته‌بندی تراکنش دارد و قابل حذف نیست' },
        { status: 409 },
      )
    }
    await db.category.delete({ where: { id } }) // budgets cascade (schema onDelete: Cascade)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
