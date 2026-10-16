"use client";

import * as React from "react";
import { Loader2, ImagePlus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import {
  useTransaction,
  useSaveTransaction,
  useDeleteTransaction,
  useAccounts,
  useCategories,
} from "@/lib/hooks";
import type { TxType } from "@/lib/types";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import { toEnDigits } from "@/lib/jalali";
import {
  ScreenHeader,
  Field,
  PillInput,
  GradientButton,
  SegmentedTabs,
  JalaliDatePicker,
  ConfirmDialog,
  useAppFormat,
} from "@/components/app/ui";
import { getIcon } from "@/components/app/icons";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Mode = "add" | "edit";

export default function TransactionFormScreen({ params }: { params?: Record<string, unknown> }) {
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);

  const mode: Mode = (params?.mode as Mode | undefined) ?? "add";
  const id = params?.id as string | undefined;
  const initialType = (params?.type as TxType | undefined) ?? "EXPENSE";

  const [type, setType] = React.useState<TxType>(initialType);
  const [amount, setAmount] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [toAccountId, setToAccountId] = React.useState("");
  const [date, setDate] = React.useState<Date>(new Date());
  const [notes, setNotes] = React.useState("");
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hydratedRef = React.useRef(false);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(type === "INCOME" ? "INCOME" : "EXPENSE");
  const { data: tx } = useTransaction(mode === "edit" ? id : undefined);
  const save = useSaveTransaction();
  const del = useDeleteTransaction();

  // Hydrate edit form once when the transaction arrives
  React.useEffect(() => {
    if (mode === "edit" && tx && !hydratedRef.current) {
      hydratedRef.current = true;
      setType(tx.type);
      setAmount(String(tx.amount));
      setTitle(tx.title ?? "");
      setDescription(tx.description ?? "");
      setCategoryId(tx.categoryId ?? "");
      setAccountId(tx.accountId);
      setToAccountId(tx.toAccountId ?? "");
      setDate(new Date(tx.date));
      setNotes(tx.notes ?? "");
      setReceiptUrl(tx.receiptUrl);
    }
  }, [mode, tx]);

  // Preselect default account for new transactions
  React.useEffect(() => {
    if (mode === "add" && !accountId && accounts && accounts.length > 0) {
      setAccountId(accounts.find((a) => a.isDefault)?.id ?? accounts[0].id);
    }
  }, [mode, accounts, accountId]);

  const changeType = (t: TxType) => {
    setType(t);
    if (t === "TRANSFER") setCategoryId("");
    else {
      setToAccountId("");
      if (categoryId) setCategoryId("");
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 400_000) {
      toast.error(f.t("common.error"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setReceiptUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    const parsed = parseAmountInput(amount);
    if (!parsed || parsed <= 0) {
      toast.error(f.t("tx.invalidAmount"));
      return;
    }
    if (!accountId) {
      toast.error(f.t("tx.selectAccountFirst"));
      return;
    }
    if (type === "TRANSFER" && !toAccountId) {
      toast.error(f.t("tx.selectAccountFirst"));
      return;
    }
    if (type === "TRANSFER" && toAccountId === accountId) {
      toast.error(f.t("tx.selfTransfer"));
      return;
    }
    try {
      await save.mutateAsync({
        id: mode === "edit" ? id : undefined,
        type,
        amount: parsed,
        title: title.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        accountId,
        toAccountId: type === "TRANSFER" ? toAccountId : null,
        categoryId: type === "TRANSFER" ? null : categoryId || null,
        date: date.toISOString(),
        receiptUrl,
      });
      toast.success(mode === "edit" ? f.t("toast.txUpdated") : f.t("toast.txAdded"));
      back();
    } catch {
      toast.error(f.t("common.error"));
    }
  };

  const onDelete = async () => {
    if (!id) return;
    try {
      await del.mutateAsync(id);
      toast.success(f.t("toast.txDeleted"));
      back();
    } catch {
      toast.error(f.t("common.error"));
    }
  };

  const activeClass =
    type === "INCOME"
      ? "bg-income text-white"
      : type === "EXPENSE"
        ? "bg-expense text-white"
        : "bg-[#A78BCA] text-white";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={mode === "edit" ? f.t("tx.edit") : f.t("tx.add")} onBack={back} />
      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {/* Type */}
        <SegmentedTabs<TxType>
          value={type}
          onChange={changeType}
          activeClass={activeClass}
          options={[
            { value: "INCOME", label: f.t("tx.income") },
            { value: "EXPENSE", label: f.t("tx.expense") },
            { value: "TRANSFER", label: f.t("tx.transfer") },
          ]}
        />

        {/* Amount */}
        <div className="bg-card rounded-2xl card-soft p-4">
          <div className="flex items-center gap-2">
            <input
              dir="ltr"
              inputMode="numeric"
              value={formatAmountInput(amount, f.lang)}
              onChange={(e) => setAmount(toEnDigits(e.target.value).replace(/[^\d]/g, ""))}
              placeholder={f.t("tx.amountPlaceholder")}
              className="num-input flex-1 w-full text-center text-[24px] font-extrabold bg-transparent outline-none placeholder:text-muted-foreground/50"
            />
            <span className="text-muted-foreground text-[13px] shrink-0">{f.t("common.toman")}</span>
          </div>
        </div>

        {/* Title */}
        <Field label={f.t("tx.mainTitle")}>
          <PillInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={f.t("tx.mainTitlePlaceholder")}
          />
        </Field>

        {/* Description */}
        <Field label={f.t("common.description")}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-2xl bg-card border-border text-[14px] min-h-[84px]"
          />
        </Field>

        {/* Categories (hidden for transfers) */}
        {type !== "TRANSFER" && (
          <Field label={f.t("tx.category")}>
            <div className="flex flex-wrap gap-2">
              {(categories ?? []).map((c) => {
                const selected = categoryId === c.id;
                const Icon = getIcon(c.icon);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(selected ? "" : c.id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold border transition-all active:scale-95 ${
                      selected
                        ? ""
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                    style={
                      selected
                        ? { backgroundColor: `${c.color}1f`, color: c.color, borderColor: c.color }
                        : undefined
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* Accounts */}
        {type === "TRANSFER" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={f.t("tx.fromAccount")}>
              <Select value={accountId || ""} onValueChange={setAccountId}>
                <SelectTrigger className="h-12 rounded-2xl bg-card text-[13px] font-semibold">
                  <SelectValue placeholder={f.t("tx.selectAccount")} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-card max-h-64">
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-[13px]">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={f.t("tx.toAccount")}>
              <Select value={toAccountId || ""} onValueChange={setToAccountId}>
                <SelectTrigger className="h-12 rounded-2xl bg-card text-[13px] font-semibold">
                  <SelectValue placeholder={f.t("tx.selectAccount")} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl bg-card max-h-64">
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-[13px]">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : (
          <Field label={f.t("tx.account")}>
            <Select value={accountId || ""} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-2xl bg-card text-[13px] font-semibold">
                <SelectValue placeholder={f.t("tx.selectAccount")} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl bg-card max-h-64">
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-[13px]">
                    <span className="flex items-center justify-between gap-3 w-full">
                      <span>{a.name}</span>
                      <span className="num-input text-[11px] text-muted-foreground">
                        {f.money(a.balance, false)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {/* Date */}
        <Field label={f.t("common.date")}>
          <JalaliDatePicker value={date} onChange={setDate} />
        </Field>

        {/* Receipt */}
        <Field label={f.t("tx.receiptOptional")}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          {receiptUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={receiptUrl}
                alt={f.t("tx.receipt")}
                className="h-16 w-16 rounded-xl object-cover border border-border bg-card"
              />
              <button
                type="button"
                onClick={() => setReceiptUrl(null)}
                aria-label={f.t("tx.removeReceipt")}
                className="w-8 h-8 rounded-full bg-expense-soft text-expense flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-14 w-full rounded-2xl border border-dashed border-border bg-card flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <ImagePlus className="w-5 h-5" />
              {f.t("tx.receipt")}
            </button>
          )}
        </Field>

        {/* Save */}
        <GradientButton onClick={onSave} disabled={save.isPending} className="mt-1">
          {save.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : f.t("tx.save")}
        </GradientButton>

        {/* Delete (edit mode only) */}
        {mode === "edit" && id && (
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="h-12 w-full rounded-2xl bg-expense-soft text-expense text-[14px] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
              {f.t("common.delete")}
            </button>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              onConfirm={onDelete}
              title={f.t("tx.deleteConfirm")}
              confirmLabel={f.t("common.delete")}
              cancelLabel={f.t("common.cancel")}
            />
          </>
        )}
      </div>
    </div>
  );
}
