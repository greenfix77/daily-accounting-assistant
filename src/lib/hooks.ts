"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, qs } from "./api";
import type {
  AccountDTO,
  BudgetsDTO,
  BudgetItemDTO,
  CategoryDTO,
  DashboardDTO,
  DebtDTO,
  ProfileDTO,
  RecurringDTO,
  ReminderDTO,
  ReportsDTO,
  SavingsGoalDTO,
  TransactionDTO,
  TxType,
  ReportPeriod,
} from "./types";

// ── Settings / Profile ───────────────────────────────────────
export function useSettings() {
  return useQuery<ProfileDTO>({
    queryKey: ["settings"],
    queryFn: () => api<ProfileDTO>("/api/settings"),
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProfileDTO>) =>
      api<ProfileDTO>("/api/settings", { method: "PATCH", body: patch }),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
      qc.invalidateQueries();
    },
  });
}

// ── Dashboard ────────────────────────────────────────────────
export function useDashboard() {
  return useQuery<DashboardDTO>({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardDTO>("/api/dashboard"),
  });
}

// ── Transactions ─────────────────────────────────────────────
export type TxFilters = {
  type?: TxType;
  q?: string;
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  sort?: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  limit?: number;
};

export function useTransactions(filters: TxFilters = {}) {
  return useQuery<TransactionDTO[]>({
    queryKey: ["transactions", filters],
    queryFn: () =>
      api<TransactionDTO[]>(`/api/transactions${qs({ ...filters })}`),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery<TransactionDTO>({
    queryKey: ["transactions", "detail", id],
    queryFn: () => api<TransactionDTO>(`/api/transactions/${id}`),
    enabled: !!id,
  });
}

export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<TransactionDTO>(`/api/transactions/${id}`, { method: "PATCH", body })
        : api<TransactionDTO>("/api/transactions", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Accounts ─────────────────────────────────────────────────
export function useAccounts() {
  return useQuery<AccountDTO[]>({
    queryKey: ["accounts"],
    queryFn: () => api<AccountDTO[]>("/api/accounts"),
  });
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<AccountDTO>(`/api/accounts/${id}`, { method: "PATCH", body })
        : api<AccountDTO>("/api/accounts", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/accounts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Categories ───────────────────────────────────────────────
export function useCategories(type?: "INCOME" | "EXPENSE", withStats = false) {
  return useQuery<CategoryDTO[]>({
    queryKey: ["categories", type ?? "all", withStats],
    queryFn: () =>
      api<CategoryDTO[]>(
        `/api/categories${qs({ type, stats: withStats ? 1 : undefined })}`
      ),
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<CategoryDTO>(`/api/categories/${id}`, { method: "PATCH", body })
        : api<CategoryDTO>("/api/categories", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Budgets ──────────────────────────────────────────────────
export function useBudgets(month?: string) {
  return useQuery<BudgetsDTO>({
    queryKey: ["budgets", month ?? "current"],
    queryFn: () => api<BudgetsDTO>(`/api/budgets${qs({ month })}`),
  });
}

export function useSaveBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<BudgetItemDTO>(`/api/budgets/${id}`, { method: "PATCH", body })
        : api<BudgetItemDTO>("/api/budgets", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Debts ────────────────────────────────────────────────────
export function useDebts() {
  return useQuery<DebtDTO[]>({
    queryKey: ["debts"],
    queryFn: () => api<DebtDTO[]>("/api/debts"),
  });
}

export function useSaveDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<DebtDTO>(`/api/debts/${id}`, { method: "PATCH", body })
        : api<DebtDTO>("/api/debts", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/debts/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useAddDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, ...body }: { debtId: string; amount: number; date?: string; notes?: string }) =>
      api<DebtDTO>(`/api/debts/${debtId}/payments`, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Recurring ────────────────────────────────────────────────
export function useRecurring() {
  return useQuery<RecurringDTO[]>({
    queryKey: ["recurring"],
    queryFn: () => api<RecurringDTO[]>("/api/recurring"),
  });
}

export function useSaveRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<RecurringDTO>(`/api/recurring/${id}`, { method: "PATCH", body })
        : api<RecurringDTO>("/api/recurring", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function usePayRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) =>
      api<{ ok: boolean }>(`/api/recurring/${id}/pay`, { method: "POST", body: date ? { date } : {} }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Savings ──────────────────────────────────────────────────
export function useSavings() {
  return useQuery<SavingsGoalDTO[]>({
    queryKey: ["savings"],
    queryFn: () => api<SavingsGoalDTO[]>("/api/savings"),
  });
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<SavingsGoalDTO>(`/api/savings/${id}`, { method: "PATCH", body })
        : api<SavingsGoalDTO>("/api/savings", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/savings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useAddDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, ...body }: { goalId: string; amount: number; date?: string; notes?: string }) =>
      api<SavingsGoalDTO>(`/api/savings/${goalId}/deposits`, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Reminders ────────────────────────────────────────────────
export function useReminders(pendingOnly = false) {
  return useQuery<ReminderDTO[]>({
    queryKey: ["reminders", pendingOnly],
    queryFn: () => api<ReminderDTO[]>(`/api/reminders${qs({ pending: pendingOnly ? 1 : undefined })}`),
  });
}

export function useSaveReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown> & { id?: string }) => {
      const { id, ...body } = payload;
      return id
        ? api<ReminderDTO>(`/api/reminders/${id}`, { method: "PATCH", body })
        : api<ReminderDTO>("/api/reminders", { method: "POST", body });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useToggleReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      api<ReminderDTO>(`/api/reminders/${id}`, { method: "PATCH", body: { isDone } }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/reminders/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Reports ──────────────────────────────────────────────────
export function useReports(period: ReportPeriod, offset = 0) {
  return useQuery<ReportsDTO>({
    queryKey: ["reports", period, offset],
    queryFn: () => api<ReportsDTO>(`/api/reports${qs({ period, offset })}`),
  });
}

// ── Auth ─────────────────────────────────────────────────────
export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api<ProfileDTO>("/api/auth/login", { method: "POST", body: { email } }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string }) =>
      api<ProfileDTO>("/api/auth/register", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Backup restore ───────────────────────────────────────────
export function useRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api<{ ok: boolean }>("/api/backup/restore", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries(),
  });
}
