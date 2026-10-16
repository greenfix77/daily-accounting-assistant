"use client";

import * as React from "react";
import { Bell, BellRing, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ConfirmDialog,
  EmptyState,
  Field,
  GradientButton,
  JalaliDatePicker,
  PillInput,
  ScreenHeader,
  useAppFormat,
} from "@/components/app/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import {
  useDeleteReminder,
  useReminders,
  useSaveReminder,
  useToggleReminder,
} from "@/lib/hooks";
import type { ReminderType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: ReminderType[] = ["BILL", "INSTALLMENT", "DEBT", "SAVINGS", "CUSTOM"];
const TYPE_LABEL_KEY: Record<ReminderType, string> = {
  BILL: "rem.bill",
  INSTALLMENT: "rem.installment",
  DEBT: "rem.debt",
  SAVINGS: "rem.savings",
  CUSTOM: "rem.custom",
};

export default function RemindersScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);

  const { data: reminders, isLoading } = useReminders();
  const saveReminder = useSaveReminder();
  const toggleReminder = useToggleReminder();
  const deleteReminder = useDeleteReminder();

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<ReminderType>("BILL");
  const [date, setDate] = React.useState<Date>(new Date());
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const pending = React.useMemo(() => (reminders ?? []).filter((r) => !r.isDone), [reminders]);
  const done = React.useMemo(() => (reminders ?? []).filter((r) => r.isDone), [reminders]);

  const openDialog = () => {
    setTitle("");
    setType("BILL");
    setDate(new Date());
    setOpen(true);
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    try {
      await saveReminder.mutateAsync({
        title: title.trim(),
        type,
        date: date.toISOString(),
      });
      toast.success(f.t("common.saved"));
      setOpen(false);
      setTitle("");
      setType("BILL");
      setDate(new Date());
    } catch {
      toast.error(f.t("common.error"));
    }
  };

  const onToggle = (id: string, isDone: boolean) => {
    toggleReminder.mutate({ id, isDone });
    if (isDone) toast.success(f.t("toast.reminderDone"));
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteReminder.mutate(deleteId, {
      onSuccess: () => toast.success(f.t("common.deleted")),
    });
    setDeleteId(null);
  };

  const renderRow = (id: string, rTitle: string, rDate: string, isDone: boolean, daysLeft: number) => {
    const color = isDone ? "#8FA899" : "#E5757A";
    return (
      <div
        key={id}
        className={cn(
          "bg-card rounded-2xl card-soft p-3.5 flex items-center gap-3",
          isDone && "opacity-60"
        )}
      >
        <span
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Bell className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-[14px] text-foreground truncate", isDone && "line-through")}>
            {rTitle}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {f.dateLong(rDate)}
            {daysLeft >= 0 ? ` • ${f.daysLabel(rDate)}` : ""}
          </p>
        </div>
        <Checkbox
          checked={isDone}
          onCheckedChange={(v) => onToggle(id, v === true)}
          className="shrink-0"
          aria-label={f.t("rem.markDone")}
        />
        <button
          type="button"
          onClick={() => setDeleteId(id)}
          aria-label={f.t("common.delete")}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-expense hover:bg-expense/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader
        title={f.t("rem.title")}
        onBack={back}
        right={
          <button
            type="button"
            onClick={openDialog}
            aria-label={f.t("rem.add")}
            className="w-9 h-9 rounded-full bg-secondary text-primary flex items-center justify-center hover:bg-accent transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-[13px]">
            {f.t("common.loading")}
          </div>
        ) : reminders && reminders.length > 0 ? (
          <>
            {pending.length > 0 && (
              <>
                <p className="text-[12px] font-bold text-muted-foreground px-1">{f.t("rem.pending")}</p>
                {pending.map((r) => renderRow(r.id, r.title, r.date, r.isDone, r.daysLeft))}
              </>
            )}
            {done.length > 0 && (
              <>
                <p className="text-[12px] font-bold text-muted-foreground px-1 mt-1">{f.t("rem.done")}</p>
                {done.map((r) => renderRow(r.id, r.title, r.date, r.isDone, r.daysLeft))}
              </>
            )}
          </>
        ) : (
          <EmptyState
            icon={<BellRing className="w-7 h-7" />}
            title={f.t("rem.empty")}
            desc={f.t("rem.emptyDesc")}
            action={
              <GradientButton className="w-auto px-8" onClick={openDialog}>
                {f.t("rem.add")}
              </GradientButton>
            }
          />
        )}
      </div>

      {/* Add reminder dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px] rounded-3xl bg-card">
          <DialogHeader className="text-right space-y-0">
            <DialogTitle className="text-[16px] font-bold text-foreground">{f.t("rem.add")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3.5">
            <Field label={f.t("rem.titleLabel")}>
              <PillInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={f.t("rem.titleLabelPlaceholder")}
              />
            </Field>
            <Field label={f.t("rem.reminderType")}>
              <Select value={type} onValueChange={(v) => setType(v as ReminderType)} dir="rtl">
                <SelectTrigger className="h-12 w-full rounded-2xl bg-card border-border text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-card" dir="rtl">
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-[14px] rounded-xl">
                      {f.t(TYPE_LABEL_KEY[t])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={f.t("common.date")}>
              <JalaliDatePicker value={date} onChange={setDate} />
            </Field>
            <GradientButton onClick={() => void save()} disabled={saveReminder.isPending}>
              {saveReminder.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                f.t("common.save")
              )}
            </GradientButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title={f.t("rem.deleteConfirm")}
      />
    </div>
  );
}
