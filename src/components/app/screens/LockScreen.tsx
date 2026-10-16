"use client";

import * as React from "react";
import { Delete, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/hooks";
import { makeT } from "@/lib/i18n";
import { toFaDigits, toEnDigits } from "@/lib/jalali";

export default function LockScreen({
  onUnlock,
  visible = true,
}: {
  onUnlock?: () => void;
  visible?: boolean;
}) {
  const { data: settings } = useSettings();
  const lang = settings?.language ?? "fa";
  const t = React.useMemo(() => makeT(lang), [lang]);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState(false);

  if (!visible) return null;

  const submit = (code: string) => {
    if (code === (settings?.pin ?? "")) {
      sessionStorage.setItem("app-unlocked", "1");
      onUnlock?.();
    } else {
      setError(true);
      setTimeout(() => {
        setError(false);
        setPin("");
      }, 500);
    }
  };

  const press = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) setTimeout(() => submit(next), 150);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="w-16 h-16 rounded-3xl app-gradient flex items-center justify-center shadow-lg shadow-primary/30">
        <Lock className="w-8 h-8 text-white" />
      </div>
      <div className="text-center">
        <p className="font-bold text-foreground">{t("lock.title")}</p>
        <p className="text-[13px] text-muted-foreground mt-1">{t("lock.subtitle")}</p>
      </div>
      <div className="flex gap-3" dir="ltr">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border-2 border-primary/50 transition-all",
              pin.length > i && "bg-primary border-primary scale-110",
              error && "border-expense bg-expense/40"
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="w-16 h-16 rounded-2xl bg-card card-soft text-[20px] font-bold text-foreground hover:bg-secondary active:scale-95 transition-all"
          >
            {lang === "fa" ? toFaDigits(d) : d}
          </button>
        ))}
        <span />
        <button
          onClick={() => press("0")}
          className="w-16 h-16 rounded-2xl bg-card card-soft text-[20px] font-bold text-foreground hover:bg-secondary active:scale-95 transition-all"
        >
          {lang === "fa" ? toFaDigits("0") : "0"}
        </button>
        <button
          onClick={() => setPin((p) => toEnDigits(p).slice(0, -1))}
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary active:scale-95 transition-all"
          aria-label="delete"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
