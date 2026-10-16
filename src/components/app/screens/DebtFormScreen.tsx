"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
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
import { useDebts, useDeleteDebt, useSaveDebt } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import type { DebtType } from "@/lib/types";

export default function DebtFormScreen({ params }: { params?: Record<string, unknown> }) {
  const p = params ?? {};
  const id = typeof p.id === "string" ? p.id : undefined;
  const paramType: DebtType | undefined =
    p.type === "I_OWE" ? "I_OWE" : p.type === "OWED_TO_ME" ? "OWED_TO_ME" : undefined;

  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const { data: debts } = useDebts();
  const saveDebt = useSaveDebt();
  const deleteDebt = useDeleteDebt();

  const existing = React.useMemo(
    () => (id ? debts?.find((d) => d.id === id) : undefined),
    [debts, id]
  );

  const [person, setPerson] = React.useState("");
  const [type, setType] = React.useState<DebtType>(paramType ?? "OWED_TO_ME");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState<Date>(new Date());
  const [dueDate, setDueDate] = React.useState<Date | null>(null);
  const [notes, setNotes] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!existing) return;
    setPerson(existing.person);
    setType(existing.type);
    setAmount(existing.amount ? formatAmountInput(String(existing.amount), f.lang) : "");
    setDate(new Date(existing.date));
    setDueDate(existing.dueDate ? new Date(existing.dueDate) : null);
    setNotes(existing.notes ?? "");
  }, [existing, f.lang]);

  const submit = () => {
    if (!person.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    const amt = parseAmountInput(toEnDigits(amount));
    if (amt <= 0) {
      toast.error(f.t("common.required"));
      return;
    }
    saveDebt.mutate(
      {
        id,
        person: person.trim(),
        type,
        amount: amt,
        date: date.toISOString(),
        dueDate: dueDate ? dueDate.toISOString() : null,
        notes: notes.trim() || null,
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
    deleteDebt.mutate(id, {
      onSuccess: () => {
        toast.success(f.t("common.deleted"));
        back();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={id ? f.t("common.edit") : f.t("debt.add")} onBack={back} />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {/* type + person + amount */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("debt.debtType")}>
            <SegmentedTabs<DebtType>
              value={type}
              onChange={setType}
              options={[
                { value: "OWED_TO_ME", label: f.t("debt.owedToMe") },
                { value: "I_OWE", label: f.t("debt.iOwe") },
              ]}
            />
          </Field>
          <Field label={f.t("debt.person")} required>
            <PillInput
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder={f.t("debt.personPlaceholder")}
            />
          </Field>
          <Field label={f.t("debt.amount")} required>
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

        {/* dates */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("debt.creationDate")}>
            <JalaliDatePicker value={date} onChange={setDate} />
          </Field>
          <Field label={`${f.t("debt.dueDate")} (${f.t("common.optional")})`}>
            <JalaliDatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder={f.t("debt.dueDate")}
            />
          </Field>
        </div>

        {/* notes */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("common.notes")}>
            <PillInput
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={f.t("common.optional")}
            />
          </Field>
        </div>

        <GradientButton onClick={submit} disabled={saveDebt.isPending} className="mt-1">
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
        title={f.t("debt.deleteConfirm")}
      />
    </div>
  );
}
