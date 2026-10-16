"use client";

import * as React from "react";
import {
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  GradientButton,
  IconBubble,
  JalaliDatePicker,
  PillInput,
  ProgressBar,
  ProgressRing,
  ScreenHeader,
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
import { useAddDeposit, useDeleteGoal, useSavings } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";
import type { SavingsGoalDTO } from "@/lib/types";

interface DepositDialogState {
  goalId: string;
  goalName: string;
  withdraw: boolean;
}

// ── Goal row (non-featured) ──────────────────────────────────
function GoalRow({
  goal,
  onDeposit,
  onWithdraw,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoalDTO;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const f = useAppFormat();
  return (
    <div className="bg-card rounded-2xl card-soft p-4 flex items-center gap-3">
      <IconBubble icon={goal.icon} color={goal.color} />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="font-semibold text-[14px] text-foreground truncate">
          {goal.name}
        </span>
        <ProgressBar value={goal.percent} fixedColor={goal.color} />
      </div>
      <div className="flex flex-col items-end shrink-0">
        <span className="text-[12px] font-bold num-input">{f.money(goal.current)}</span>
        <span className="text-[11px] text-muted-foreground num-input">
          {f.fa(Math.round(goal.percent))}%
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="more"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors shrink-0"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl bg-card w-44">
          <DropdownMenuItem onClick={onDeposit} className="text-[13px] gap-2">
            <Plus className="w-3.5 h-3.5" />
            {f.t("sav.deposit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onWithdraw} className="text-[13px] gap-2">
            <Minus className="w-3.5 h-3.5" />
            {f.t("sav.withdraw")}
          </DropdownMenuItem>
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
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function SavingsScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const push = useAppStore((s) => s.push);
  const { data: goals = [], isLoading } = useSavings();
  const addDeposit = useAddDeposit();
  const deleteGoal = useDeleteGoal();

  const [dlg, setDlg] = React.useState<DepositDialogState | null>(null);
  const [depAmount, setDepAmount] = React.useState("");
  const [depDate, setDepDate] = React.useState<Date>(new Date());
  const [deleteTarget, setDeleteTarget] = React.useState<SavingsGoalDTO | null>(null);

  const featured = goals[0];
  const rest = goals.slice(1);

  const openDeposit = (g: SavingsGoalDTO, withdraw: boolean) => {
    setDlg({ goalId: g.id, goalName: g.name, withdraw });
    setDepAmount("");
    setDepDate(new Date());
  };

  const submitDeposit = () => {
    if (!dlg) return;
    const amount = parseAmountInput(toEnDigits(depAmount));
    if (amount <= 0) {
      toast.error(f.t("common.required"));
      return;
    }
    const goal = goals.find((g) => g.id === dlg.goalId);
    if (dlg.withdraw && goal && amount > goal.current) {
      toast.error(f.t("sav.withdrawTooBig"));
      return;
    }
    addDeposit.mutate(
      {
        goalId: dlg.goalId,
        amount: dlg.withdraw ? -amount : amount,
        date: depDate.toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(f.t("common.success"));
          setDlg(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteGoal.mutate(deleteTarget.id, {
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
        title={f.t("sav.title")}
        onBack={back}
        right={
          <button
            onClick={() => push("goal-form", {})}
            aria-label="add goal"
            className="w-9 h-9 rounded-full app-gradient text-white flex items-center justify-center shadow-md shadow-primary/25 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-center text-[13px] text-muted-foreground py-10">
            {f.t("common.loading")}
          </p>
        ) : goals.length === 0 ? (
          <EmptyState
            icon={<Target className="w-7 h-7" />}
            title={f.t("sav.empty")}
            desc={f.t("sav.emptyDesc")}
            action={
              <GradientButton
                className="w-auto px-8"
                onClick={() => push("goal-form", {})}
              >
                {f.t("sav.add")}
              </GradientButton>
            }
          />
        ) : (
          <>
            {/* featured goal */}
            {featured && (
              <div className="bg-card rounded-2xl card-soft p-6 flex flex-col items-center gap-2.5">
                <ProgressRing
                  percent={Math.min(featured.percent, 100)}
                  color={featured.color}
                  size={132}
                >
                  <span className="text-[22px] font-extrabold num-input">
                    {f.fa(Math.round(featured.percent))}%
                  </span>
                </ProgressRing>
                <p className="font-bold text-[15px] text-foreground mt-1">
                  {featured.name}
                </p>
                <p className="text-[12px] text-muted-foreground num-input">
                  {f.money(featured.current)} / {f.money(featured.targetAmount)}
                </p>
                {featured.percent >= 100 && (
                  <span className="rounded-full bg-income-soft text-income px-2.5 py-1 text-[11px] font-bold">
                    {f.t("sav.completed")}
                  </span>
                )}
                <div className="flex items-center gap-2 w-full pt-2">
                  <button
                    onClick={() => openDeposit(featured, false)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-income-soft text-income rounded-xl h-10 text-[13px] font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    {f.t("sav.deposit")}
                  </button>
                  <button
                    onClick={() => openDeposit(featured, true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-expense-soft text-expense rounded-xl h-10 text-[13px] font-bold hover:opacity-90 transition-opacity"
                  >
                    <Minus className="w-4 h-4" />
                    {f.t("sav.withdraw")}
                  </button>
                </div>
              </div>
            )}

            {/* other goals */}
            {rest.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                onDeposit={() => openDeposit(g, false)}
                onWithdraw={() => openDeposit(g, true)}
                onEdit={() => push("goal-form", { id: g.id })}
                onDelete={() => setDeleteTarget(g)}
              />
            ))}
          </>
        )}
      </div>

      {/* deposit / withdraw dialog */}
      <Dialog open={!!dlg} onOpenChange={(v) => !v && setDlg(null)}>
        <DialogContent className="max-w-[340px] rounded-3xl bg-card p-5 gap-4">
          <DialogHeader className="space-y-0 text-right">
            <DialogTitle className="text-[15px] text-start">
              {dlg?.withdraw ? f.t("sav.withdraw") : f.t("sav.deposit")} — {dlg?.goalName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <PillInput
              inputMode="numeric"
              placeholder={f.t("sav.depositAmount")}
              value={depAmount}
              onChange={(e) =>
                setDepAmount(formatAmountInput(toEnDigits(e.target.value), f.lang))
              }
              className={cn(dlg?.withdraw && "text-expense")}
            />
            <JalaliDatePicker value={depDate} onChange={setDepDate} />
            <GradientButton
              onClick={submitDeposit}
              disabled={addDeposit.isPending}
              className={cn(dlg?.withdraw && "bg-expense text-white shadow-expense/25")}
            >
              {f.t("common.confirm")}
            </GradientButton>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={f.t("sav.deleteConfirm")}
      />
    </div>
  );
}
