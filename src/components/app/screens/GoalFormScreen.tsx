"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  ColorDots,
  ConfirmDialog,
  Field,
  GradientButton,
  JalaliDatePicker,
  PillInput,
  ScreenHeader,
  useAppFormat,
} from "../ui";
import { COLOR_PALETTE, ICON_NAMES, getIcon } from "../icons";
import { useDeleteGoal, useSaveGoal, useSavings } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import { cn } from "@/lib/utils";

export default function GoalFormScreen({ params }: { params?: Record<string, unknown> }) {
  const p = params ?? {};
  const id = typeof p.id === "string" ? p.id : undefined;

  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const { data: goals } = useSavings();
  const saveGoal = useSaveGoal();
  const deleteGoal = useDeleteGoal();

  const existing = React.useMemo(
    () => (id ? goals?.find((g) => g.id === id) : undefined),
    [goals, id]
  );

  const [name, setName] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [targetDate, setTargetDate] = React.useState<Date | null>(null);
  const [icon, setIcon] = React.useState("target");
  const [color, setColor] = React.useState<string>(COLOR_PALETTE[0]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setTargetAmount(
      existing.targetAmount
        ? formatAmountInput(String(existing.targetAmount), f.lang)
        : ""
    );
    setTargetDate(existing.targetDate ? new Date(existing.targetDate) : null);
    setIcon(existing.icon || "target");
    setColor(existing.color || COLOR_PALETTE[0]);
  }, [existing, f.lang]);

  const submit = () => {
    if (!name.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    const target = parseAmountInput(toEnDigits(targetAmount));
    if (target <= 0) {
      toast.error(f.t("common.required"));
      return;
    }
    saveGoal.mutate(
      {
        id,
        name: name.trim(),
        targetAmount: target,
        targetDate: targetDate ? targetDate.toISOString() : null,
        icon,
        color,
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
    deleteGoal.mutate(id, {
      onSuccess: () => {
        toast.success(f.t("common.deleted"));
        back();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader
        title={id ? f.t("sav.editTitle") : f.t("sav.addTitle")}
        onBack={back}
      />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {/* name + target */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("sav.goalName")} required>
            <PillInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={f.t("sav.goalNamePlaceholder")}
            />
          </Field>
          <Field label={f.t("sav.targetAmount")} required>
            <div className="relative">
              <PillInput
                inputMode="numeric"
                className="num-input pl-14"
                value={targetAmount}
                onChange={(e) =>
                  setTargetAmount(formatAmountInput(toEnDigits(e.target.value), f.lang))
                }
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                {f.t("common.toman")}
              </span>
            </div>
          </Field>
          <Field label={`${f.t("sav.targetDate")} (${f.t("common.optional")})`}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <JalaliDatePicker
                  value={targetDate}
                  onChange={setTargetDate}
                  placeholder={f.t("sav.targetDate")}
                />
              </div>
              {targetDate && (
                <button
                  type="button"
                  onClick={() => setTargetDate(null)}
                  aria-label="clear date"
                  className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
        </div>

        {/* icon */}
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-3">
          <Field label={f.t("common.type")}>
            <div className="grid grid-cols-6 gap-2">
              {ICON_NAMES.map((name_) => {
                const Icon = getIcon(name_);
                return (
                  <button
                    key={name_}
                    type="button"
                    onClick={() => setIcon(name_)}
                    aria-label={name_}
                    className={cn(
                      "h-11 rounded-xl flex items-center justify-center transition-colors",
                      icon === name_
                        ? "app-gradient text-white"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={f.t("cat.color")}>
            <ColorDots colors={COLOR_PALETTE} value={color} onChange={setColor} />
          </Field>
        </div>

        <GradientButton onClick={submit} disabled={saveGoal.isPending} className="mt-1">
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
        title={f.t("sav.deleteConfirm")}
      />
    </div>
  );
}
