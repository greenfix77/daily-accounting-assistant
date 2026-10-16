"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  HandCoins,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  GradientButton,
  JalaliDatePicker,
  PillInput,
  ProgressBar,
  ScreenHeader,
  SegmentedTabs,
  useAppFormat,
} from "../ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAddDebtPayment, useDebts, useDeleteDebt } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import type { DebtDTO, DebtStatus, DebtType } from "@/lib/types";

// ── Status badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: DebtStatus }) {
  const f = useAppFormat();
  const label =
    status === "PAID"
      ? f.t("debt.settled")
      : status === "OVERDUE"
        ? f.t("debt.overdue")
        : f.t("debt.pending");
  const cls =
    status === "PAID"
      ? "bg-income-soft text-income"
      : status === "OVERDUE"
        ? "bg-expense-soft text-expense"
        : "bg-warn-soft text-warn";
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0", cls)}>
      {label}
    </span>
  );
}

// ── Debt card ────────────────────────────────────────────────
function DebtCard({
  debt,
  onPay,
  onSettle,
  onEdit,
  onDelete,
  settlePending,
}: {
  debt: DebtDTO;
  onPay: () => void;
  onSettle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  settlePending: boolean;
}) {
  const f = useAppFormat();
  const paid = debt.status === "PAID" || debt.remaining <= 0;
  const progress = debt.amount > 0 ? (debt.paidAmount / debt.amount) * 100 : 0;

  return (
    <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-2.5">
      {/* row 1: person + badge + menu */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-[14px] text-foreground flex-1 truncate">
          {debt.person}
        </span>
        <StatusBadge status={debt.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="more"
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl bg-card w-40">
            <DropdownMenuItem onClick={onEdit} className="text-[13px] gap-2">
              <Pencil className="w-3.5 h-3.5" />
              {f.t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-[13px] gap-2 text-expense focus:text-expense"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {f.t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* row 2: amount */}
      <div>
        <p
          className={cn(
            "text-[20px] font-extrabold leading-tight num-input",
            paid ? "text-muted-foreground line-through" : "text-foreground"
          )}
        >
          {f.money(paid ? debt.amount : debt.remaining)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {f.t("debt.paid")}:{" "}
          <span className="num-input">{f.money(debt.paidAmount)}</span>
        </p>
      </div>

      {/* progress when partially paid */}
      {debt.paidAmount > 0 && debt.paidAmount < debt.amount && (
        <ProgressBar value={progress} fixedColor="#4E9B72" />
      )}

      {/* row 3: due date chip */}
      {debt.dueDate && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium",
            debt.status === "OVERDUE" ? "text-expense" : "text-muted-foreground"
          )}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="num-input">{f.dateShort(debt.dueDate)}</span>
          <span>•</span>
          {f.daysLabel(debt.dueDate)}
        </span>
      )}

      {/* actions */}
      {!paid && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onPay}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-income-soft text-income rounded-xl h-9 px-3 text-[12px] font-bold hover:opacity-90 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4" />
            {f.t("debt.recordPayment")}
          </button>
          <button
            onClick={onSettle}
            disabled={settlePending || debt.remaining <= 0}
            className="inline-flex items-center justify-center bg-secondary text-primary rounded-xl h-9 px-3 text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {f.t("debt.markSettled")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function DebtsScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const push = useAppStore((s) => s.push);
  const { data: debts = [], isLoading } = useDebts();
  const addPayment = useAddDebtPayment();
  const deleteDebt = useDeleteDebt();

  const [tab, setTab] = React.useState<DebtType>("OWED_TO_ME");
  const [payTarget, setPayTarget] = React.useState<DebtDTO | null>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [payDate, setPayDate] = React.useState<Date>(new Date());
  const [deleteTarget, setDeleteTarget] = React.useState<DebtDTO | null>(null);

  const list = React.useMemo(
    () => debts.filter((d) => d.type === tab),
    [debts, tab]
  );

  const openPay = (d: DebtDTO) => {
    setPayTarget(d);
    setPayAmount("");
    setPayDate(new Date());
  };

  const submitPayment = () => {
    if (!payTarget) return;
    const amount = parseAmountInput(toEnDigits(payAmount));
    if (amount <= 0) {
      toast.error(f.t("common.required"));
      return;
    }
    if (amount > payTarget.remaining) {
      toast.error(f.t("debt.paymentTooBig"));
      return;
    }
    addPayment.mutate(
      { debtId: payTarget.id, amount, date: payDate.toISOString() },
      {
        onSuccess: () => {
          toast.success(f.t("debt.paymentAdded"));
          setPayTarget(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const settleFully = (d: DebtDTO) => {
    addPayment.mutate(
      { debtId: d.id, amount: d.remaining },
      {
        onSuccess: () => toast.success(f.t("debt.paymentAdded")),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDebt.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(f.t("common.deleted"));
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader
        title={f.t("debt.title")}
        onBack={back}
        right={
          <button
            onClick={() => push("debt-form", {})}
            aria-label="add debt"
            className="w-9 h-9 rounded-full app-gradient text-white flex items-center justify-center shadow-md shadow-primary/25 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        <SegmentedTabs<DebtType>
          value={tab}
          onChange={setTab}
          options={[
            { value: "OWED_TO_ME", label: f.t("debt.tabReceivables") },
            { value: "I_OWE", label: f.t("debt.tabDebts") },
          ]}
        />

        {isLoading ? (
          <p className="text-center text-[13px] text-muted-foreground py-10">
            {f.t("common.loading")}
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="w-7 h-7" />}
            title={f.t("debt.empty")}
            desc={f.t("debt.emptyDesc")}
          />
        ) : (
          list.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              settlePending={addPayment.isPending}
              onPay={() => openPay(d)}
              onSettle={() => settleFully(d)}
              onEdit={() => push("debt-form", { id: d.id })}
              onDelete={() => setDeleteTarget(d)}
            />
          ))
        )}
      </div>

      {/* payment dialog */}
      <Dialog open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)}>
        <DialogContent className="max-w-[340px] rounded-3xl bg-card p-5 gap-4">
          <DialogHeader className="space-y-0 text-right">
            <DialogTitle className="text-[15px] text-start">
              {payTarget?.person} — {f.t("debt.recordPayment")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <PillInput
              inputMode="numeric"
              placeholder={f.t("debt.paymentAmount")}
              value={payAmount}
              onChange={(e) =>
                setPayAmount(formatAmountInput(toEnDigits(e.target.value), f.lang))
              }
            />
            <JalaliDatePicker value={payDate} onChange={setPayDate} />
            <GradientButton onClick={submitPayment} disabled={addPayment.isPending}>
              {f.t("debt.recordPayment")}
            </GradientButton>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={f.t("debt.deleteConfirm")}
      />
    </div>
  );
}
