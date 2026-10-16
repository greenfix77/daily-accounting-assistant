/**
 * Factory reset for «حساب یار ری را»
 * Run: bun run db:seed
 *
 * ⚠️ This app ships with an EMPTY database by design:
 *    after install, the user enters all of their real data themselves
 *    (profile via onboarding/register, then accounts, categories, ...).
 *
 * This script wipes every table (FK-safe order) and creates nothing.
 * The default Profile row is auto-created by /api/settings on first use.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Factory reset — wiping all data ...')

  // FK-safe deletion order (children first)
  const result = {
    debtPayments: await prisma.debtPayment.deleteMany(),
    savingsDeposits: await prisma.savingsDeposit.deleteMany(),
    transactions: await prisma.transaction.deleteMany(),
    budgets: await prisma.budget.deleteMany(),
    recurrings: await prisma.recurring.deleteMany(),
    reminders: await prisma.reminder.deleteMany(),
    savingsGoals: await prisma.savingsGoal.deleteMany(),
    debts: await prisma.debt.deleteMany(),
    categories: await prisma.category.deleteMany(),
    accounts: await prisma.account.deleteMany(),
    profiles: await prisma.profile.deleteMany(),
  }

  const total = Object.values(result).reduce((s, r) => s + r.count, 0)
  console.log('✅ Database is now EMPTY and ready for real user data')
  console.log(`   Deleted rows: ${total}`)
  for (const [table, r] of Object.entries(result)) {
    if (r.count > 0) console.log(`   - ${table}: ${r.count}`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Reset failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
