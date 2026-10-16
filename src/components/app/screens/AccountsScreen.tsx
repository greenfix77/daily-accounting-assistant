"use client";

import * as React from "react";
import { Plus, Wallet } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useAccounts } from "@/lib/hooks";
import type { AccountType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  useAppFormat,
  ScreenHeader,
  EmptyState,
  IconBubble,
  GradientButton,
} from "@/components/app/ui";

const TYPE_LABEL: Record<AccountType, string> = {
  BANK: "acc.bank",
  CASH: "acc.cash",
  SAVINGS: "acc.savings",
  CUSTOM: "acc.custom",
};

export default function AccountsScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const push = useAppStore((s) => s.push);
  const back = useAppStore((s) => s.back);
  const { data: accounts, isLoading } = useAccounts();

  const total = React.useMemo(
    () => (accounts ?? []).reduce((sum, a) => sum + a.balance, 0),
    [accounts]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader
        title={f.t("acc.title")}
        onBack={back}
        right={
          <button
            type="button"
            onClick={() => push("account-form")}
            aria-label={f.t("acc.add")}
            className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        {isLoading ? (
          <>
            <div className="h-[118px] rounded-3xl bg-secondary/60 animate-pulse" />
            <div className="h-[76px] rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="h-[76px] rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="h-[76px] rounded-2xl bg-secondary/50 animate-pulse" />
          </>
        ) : (accounts?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Wallet className="w-7 h-7" />}
            title={f.t("acc.empty")}
            desc={f.t("acc.emptyDesc")}
            action={
              <GradientButton
                onClick={() => push("account-form")}
                className="w-auto px-8"
              >
                {f.t("acc.add")}
              </GradientButton>
            }
          />
        ) : (
          <>
            {/* ── Total balance hero ── */}
            <div className="relative overflow-hidden app-gradient text-white rounded-3xl p-5 shadow-md shadow-primary/20 shrink-0">
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-14 -left-16 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute top-5 left-24 w-8 h-8 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative">
                <p className="text-[12px] text-white/80 font-medium">{f.t("acc.total")}</p>
                <p className="text-[24px] font-extrabold mt-1.5 num-input">{f.money(total)}</p>
                <p className="text-[11px] text-white/70 mt-2">
                  {f.fa(accounts?.length ?? 0)} حساب
                </p>
              </div>
            </div>

            {/* ── Account rows ── */}
            {(accounts ?? []).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => push("account-form", { id: a.id })}
                className="w-full bg-card rounded-2xl card-soft p-4 flex items-center gap-3 text-right hover:bg-accent/50 active:scale-[0.99] transition-all"
              >
                <IconBubble icon={a.icon} color={a.color} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-foreground truncate">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {f.t(TYPE_LABEL[a.type])}
                  </p>
                </div>
                <span
                  dir="ltr"
                  className={cn(
                    "num-input font-bold text-[14px] shrink-0",
                    a.balance > 0 ? "text-income" : a.balance < 0 ? "text-expense" : "text-foreground"
                  )}
                >
                  {f.money(a.balance)}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
