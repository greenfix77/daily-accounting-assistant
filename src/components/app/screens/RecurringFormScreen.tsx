"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  Field,
  GradientButton,
  JalaliDatePicker,
  PillInput,
  ScreenHeader,
  SegmentedTabs,
  useAppFormat,
} from "../ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useCategories, useDeleteRecurring, useRecurring, useSaveRecurring } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import type { Frequency } from "@/lib/types";

type RecType = "INCOME" | "EXPENSE";

export default function RecurringFormScreen({ params }: { params?: Record<string, unknown> }) {
  const p = params ?? {};
  const id = typeof p.id === "string" ? p.id : undefined;

  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const { data: items } = useRecurring();
  const saveRecurring = useSaveRecurring();
  const deleteRecurring = useDeleteRecurring();

  const existing = React.useMemo(
    () => (id ? items?.find((r) => r.id === id) : undefined),
    [items, id]
  );

  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<RecType>("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [frequency, setFrequency] = React.useState<Frequency>("MONTHLY");
  const [startDate, setStartDate] = React.useState<Date>(new Date());
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [totalCount, setTotalCount] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories(type);

  React.useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setType(existing.type);
    setAmount(existing.amount ? formatAmountInput(String(existing.amount), f.lang) : "");
    setAccountId(existing.accountId);
    setCategoryId(existing.categoryId ?? "");
    setFrequency(existing.frequency);
    setStartDate(new Date(existing.startDate));
    setEndDate(existing.endDate ? new Date(existing.endDate) : null);
    setTotalCount(existing.totalCount ? String(existing.totalCount) : "");
  }, [existing, f.lang]);

  const changeType = (t: RecType) => {
    setType(t);
    setCategoryId("");
  };

  const submit = () => {
    if (!title.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    const amt = parseAmountInput(toEnDigits(amount));
    if (amt <= 0) {
      toast.error(f.t("common.required"));
      return;
    }
    if (!accountId) {
      toast.error(f.t("common.required"));
      return;
    }
    const tc = parseAmountInput(toEnDigits(totalCount));
    saveRecurring.mutate(
      {
        id,
        title: title.trim(),
        type,
        amount: amt,
        accountId,
        categoryId: categoryId || null,
        frequency,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        totalCount: tc > 0 ? tc : null,
      },
      {
        onSuccess: () => {
          toast.success(f.t("common.saved"));
          back();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const confirmDeleteFn = () => {
    if (!id) return;
    deleteRecurring.mutate(id, {
      onSuccess: () => {
        toast.success(f.t("common.deleted"));
        back();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={id ? f.t("common.edit") : f.t("rec.add")} onBack={back} />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {/* title + type + amount */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("rec.titleField")} required>
            <PillInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={f.t("rec.titlePlaceholder")}
            />
          </Field>
          <Field label={f.t("rec.recType")}>
            <SegmentedTabs<RecType>
              value={type}
              onChange={changeType}
              options={[
                { value: "EXPENSE", label: f.t("tx.expense") },
                { value: "INCOME", label: f.t("tx.income") },
              ]}
            />
          </Field>
          <Field label={f.t("common.amount")} required>
            <div className="relative">
              <PillInput
                inputMode="numeric"
                className="num-input pl-14"
                value={amount}
                onChange={(e) =>
                  setAmount(formatAmountInput(toEnDigits(e.target.value), f.lang))
                }
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                {f.t("common.toman")}
              </span>
            </div>
          </Field>
        </div>

        {/* schedule */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("rec.frequency")} required>
            <SegmentedTabs<Frequency>
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: "DAILY", label: f.t("rec.daily") },
                { value: "WEEKLY", label: f.t("rec.weekly") },
                { value: "MONTHLY", label: f.t("rec.monthly") },
                { value: "YEARLY", label: f.t("rec.yearly") },
              ]}
            />
          </Field>
          <Field label={f.t("rec.startDate")} required>
            <JalaliDatePicker value={startDate} onChange={setStartDate} />
          </Field>
          <Field label={`${f.t("rec.endDate")} (${f.t("common.optional")})`}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <JalaliDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder={f.t("rec.endDate")}
                />
              </div>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate(null)}
                  aria-label="clear end date"
                  className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
          <Field label={`${f.t("rec.totalCount")} (${f.t("common.optional")})`}>
            <PillInput
              inputMode="numeric"
              className="num-input"
              value={totalCount}
              onChange={(e) =>
                setTotalCount(formatAmountInput(toEnDigits(e.target.value), f.lang))
              }
              placeholder={f.t("common.optional")}
            />
          </Field>
        </div>

        {/* account + category */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("tx.account")} required>
            <Select value={accountId || ""} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-2xl bg-card border-border text-[14px]">
                <SelectValue placeholder={f.t("common.select")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-card">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-[13px]">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`${f.t("tx.category")} (${f.t("common.optional")})`}>
            <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
              <SelectTrigger className="h-12 rounded-2xl bg-card border-border text-[14px]">
                <SelectValue placeholder={f.t("common.select")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-card">
                <SelectItem value="none" className="text-[13px]">
                  {f.t("common.optional")}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[13px]">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <GradientButton onClick={submit} disabled={saveRecurring.isPending} className="mt-1">
          {f.t("common.save")}
        </GradientButton>

        {id && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-1 h-12 rounded-2xl bg-expense-soft text-expense text-[14px] font-bold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
            {f.t("common.delete")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={confirmDeleteFn}
        title={f.t("rec.deleteConfirm")}
      />
    </div>
  );
}
