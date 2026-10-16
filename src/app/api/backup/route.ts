import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { serverError } from '@/app/api/_lib/core'

export const dynamic = 'force-dynamic'

// GET /api/backup → full JSON snapshot
export async function GET() {
  try {
    const [profile, accounts, categories, transactions, budgets, debts, debtPayments, recurring, savingsGoals, savingsDeposits, reminders] =
      await Promise.all([
        db.profile.findMany(),
        db.account.findMany(),
        db.category.findMany(),
        db.transaction.findMany(),
        db.budget.findMany(),
        db.debt.findMany(),
        db.debtPayment.findMany(),
        db.recurring.findMany(),
        db.savingsGoal.findMany(),
        db.savingsDeposit.findMany(),
        db.reminder.findMany(),
      ])

    return NextResponse.json({
      profile: profile[0] ?? null,
      accounts,
      categories,
      transactions,
      budgets,
      debts,
      debtPayments,
      recurring,
      savingsGoals,
      savingsDeposits,
      reminders,
      exportedAt: new Date().toISOString(),
    })
  } catch (e) {
    return serverError(e)
  }
}
