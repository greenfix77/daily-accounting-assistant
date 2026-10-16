"use client";

import * as React from "react";
import {
  CheckCircle2,
  MoreVertical,
  Pencil,
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AmountText,
  ConfirmDialog,
  EmptyState,
  IconBubble,
  ScreenHeader,
  useAppFormat,
} from "../ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteRecurring, usePayRecurring, useRecurring, useSaveRecurring } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import type { Frequency, RecurringDTO } from "@/lib/types";

function frequencyLabel(freq: Frequency, f: ReturnType<typeof useAppFormat>): string {
  switch (freq) {
    case "DAILY":
      return f.t("rec.daily");
    case "WEEKLY":
      return f.t("rec.weekly");
    case "YEARLY":
      return f.t("rec.yearly");
    default:
      return f.t("rec.monthly");
  }
}

// ── Recurring row ────────────────────────────────────────────
function RecurringRow({
  item,
  payPending,
  onPay,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: RecurringDTO;
  payPending: boolean;
  onPay: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const f = useAppFormat();
  const canPay = item.isActive && item.nextDue !== null;
  const finished = item.isActive && item.nextDue === null;

  return (
    <div className="bg-card rounded-2xl card-soft p-4 flex items-center gap-3">
      <IconBubble icon={item.categoryIcon ?? "repeat"} color={item.categoryColor ?? "#4E9B72"} />

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[14px] text-foreground truncate">
            {item.title}
          </span>
          {!item.isActive && (
            <span className="rounded-full bg-secondary text-muted-foreground px-2.5 py-1 text-[11px] font-bold shrink-0">
              {f.t("rec.paused")}
            </span>
          )}
          {finished && (
            <span className="rounded-full bg-secondary text-muted-foreground px-2.5 py-1 text-[11px] font-bold shrink-0">
              {f.t("rec.finished")}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {frequencyLabel(item.frequency, f)}
          {item.nextDue
            ? ` • ${f.t("rec.nextDue")}: ${f.daysLabel(item.nextDue)}`
            : ` • ${f.t("rec.finished")}`}
        </p>
        {item.totalCount ? (
          <p className="text-[11px] text-muted-foreground num-input">
            {f.t("rec.paidCount")}:{" "}
            {f.t("rec.remainingOf", {
              paid: f.fa(item.paidCount),
              total: f.fa(item.totalCount),
            })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <AmountText
          value={item.amount}
          type={item.type}
          className="text-[14px] font-extrabold"
        />
        <div className="flex items-center gap-1.5">
          {canPay && (
            <button
              onClick={onPay}
              disabled={payPending}
              className="inline-flex items-center gap-1.5 bg-income-soft text-income rounded-xl h-9 px-3 text-[12px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {f.t("rec.markPaid")}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="more"
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl bg-card w-44">
              <DropdownMenuItem onClick={onEdit} className="text-[13px] gap-2">
                <Pencil className="w-3.5 h-3.5" />
                {f.t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggle} className="text-[13px] gap-2">
                {item.isActive ? (
                  <>
                    <PauseCircle className="w-3.5 h-3.5" />
                    {f.t("rec.pause")}
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    {f.t("rec.resume")}
                  </>
                )}
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
      </div>
    </div>
  );
}

// ── Screen ───────────────────────────────────────────────────
export default function RecurringScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const push = useAppStore((s) => s.push);
  const { data: items = [], isLoading } = useRecurring();
  const payRecurring = usePayRecurring();
  const saveRecurring = useSaveRecurring();
  const deleteRecurring = useDeleteRecurring();

  const [deleteTarget, setDeleteTarget] = React.useState<RecurringDTO | null>(null);

  const pay = (item: RecurringDTO) => {
    payRecurring.mutate(
      { id: item.id },
      {
        onSuccess: () => toast.success(f.t("toast.recurringPaid")),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const toggleActive = (item: RecurringDTO) => {
    saveRecurring.mutate(
      { id: item.id, isActive: !item.isActive },
      { onError: (err) => toast.error(err.message) }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteRecurring.mutate(deleteTarget.id, {
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
        title={f.t("rec.title")}
        onBack={back}
        right={
          <button
            onClick={() => push("recurring-form", {})}
            aria-label="add recurring"
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
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Repeat className="w-7 h-7" />}
            title={f.t("rec.empty")}
            desc={f.t("rec.emptyDesc")}
          />
        ) : (
          items.map((item) => (
            <RecurringRow
              key={item.id}
              item={item}
              payPending={payRecurring.isPending}
              onPay={() => pay(item)}
              onEdit={() => push("recurring-form", { id: item.id })}
              onToggle={() => toggleActive(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={f.t("rec.deleteConfirm")}
      />
    </div>
  );
}
