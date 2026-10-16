"use client";

import * as React from "react";
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/hooks";
import { makeT, type TranslateFn } from "@/lib/i18n";
import type { CurrencyCode, Lang, TxType } from "@/lib/types";
import {
  formatMoney,
  formatSignedMoney,
} from "@/lib/format";
import {
  toFaDigits,
  toEnDigits,
  formatDateShort,
  formatDateLong,
  jalaliMonthLabel,
  jalaliMonthLength,
  toJalali,
  toGregorian,
  startOfDay,
  addJalaliMonths,
  isoDay,
  daysFromNowLabel,
  JALALI_MONTH_NAMES,
  WEEKDAY_SHORT_FA,
  parseJalaliInput,
} from "@/lib/jalali";
import { ICONS } from "./icons";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Central formatting/i18n context ─────────────────────────
export interface AppFormat {
  t: TranslateFn;
  lang: Lang;
  calendar: "jalali" | "gregorian";
  currency: CurrencyCode;
  money: (n: number, withUnit?: boolean) => string;
  signed: (n: number, sign: 1 | -1, withUnit?: boolean) => string;
  dateShort: (d: Date | string) => string;
  dateLong: (d: Date | string) => string;
  daysLabel: (d: Date | string) => string;
  fa: (v: string | number) => string;
}

export function useAppFormat(): AppFormat {
  const { data: settings } = useSettings();
  const lang: Lang = settings?.language ?? "fa";
  const calendar = settings?.calendar ?? "jalali";
  const currency: CurrencyCode = settings?.currency ?? "IRT";
  const t = React.useMemo(() => makeT(lang), [lang]);
  return React.useMemo(
    () => ({
      t,
      lang,
      calendar,
      currency,
      money: (n, withUnit = true) => formatMoney(n, currency, lang, withUnit),
      signed: (n, sign, withUnit = true) =>
        formatSignedMoney(n, sign, currency, lang).concat(withUnit ? "" : ""),
      dateShort: (d) => formatDateShort(d, calendar, lang),
      dateLong: (d) => formatDateLong(d, calendar, lang),
      daysLabel: (d) => daysFromNowLabel(d, lang),
      fa: (v) => (lang === "fa" ? toFaDigits(v) : String(v)),
    }),
    [t, lang, calendar, currency]
  );
}

// ── Screen header ────────────────────────────────────────────
export function ScreenHeader({
  title,
  onBack,
  right,
  left,
  transparent,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-2 px-4 py-3 bg-background/90 backdrop-blur-md",
        !transparent && "border-b border-border/50"
      )}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="back"
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-accent transition-colors shrink-0 text-foreground"
        >
          <ChevronRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180" />
        </button>
      )}
      <h1 className="text-[17px] font-bold text-foreground leading-tight flex-1 truncate">
        {title}
      </h1>
      {right}
      {left}
    </header>
  );
}

// ── Money display ────────────────────────────────────────────
export function Money({
  value,
  withUnit = false,
  className,
}: {
  value: number;
  withUnit?: boolean;
  className?: string;
}) {
  const f = useAppFormat();
  return <span className={cn("num-input", className)}>{f.money(value, withUnit)}</span>;
}

export function AmountText({
  value,
  type,
  className,
  withUnit = false,
  bold = true,
}: {
  value: number;
  type: TxType | "IN" | "OUT";
  className?: string;
  withUnit?: boolean;
  bold?: boolean;
}) {
  const f = useAppFormat();
  const positive = type === "INCOME" || type === "IN";
  const negative = type === "EXPENSE" || type === "OUT";
  const text =
    positive ? `+${f.money(value, withUnit)}` : negative ? `-${f.money(value, withUnit)}` : f.money(value, withUnit);
  return (
    <span
      className={cn(
        "num-input",
        bold && "font-bold",
        positive && "text-income",
        negative && "text-expense",
        className
      )}
      dir="ltr"
    >
      {text}
    </span>
  );
}

// ── Colored icon bubble ──────────────────────────────────────
const RegisteredIcon = React.memo(function RegisteredIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return React.createElement(ICONS[name] ?? Tag, { className });
});

export function IconBubble({
  icon,
  color,
  size = "md",
  className,
}: {
  icon: string;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const iconDims = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <span
      className={cn("flex items-center justify-center rounded-xl shrink-0", dims, className)}
      style={{ backgroundColor: `${color ?? "#4E9B72"}1f`, color: color ?? "#4E9B72" }}
    >
      <RegisteredIcon name={icon} className={iconDims} />
    </span>
  );
}

// ── Progress bar ─────────────────────────────────────────────
export function ProgressBar({
  value,
  className,
  colorByValue = true,
  fixedColor,
}: {
  value: number;
  className?: string;
  colorByValue?: boolean;
  fixedColor?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    fixedColor ?? (colorByValue ? (pct >= 100 ? "#E5757A" : pct >= 80 ? "#F0A868" : "#4E9B72") : "#4E9B72");
  return (
    <div className={cn("h-2 w-full rounded-full bg-secondary overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Progress ring (SVG) ──────────────────────────────────────
export function ProgressRing({
  percent,
  size = 120,
  stroke = 10,
  color = "#4E9B72",
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--secondary)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// ── Segmented tabs (pill) ────────────────────────────────────
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  activeClass = "bg-primary text-primary-foreground",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  activeClass?: string;
}) {
  return (
    <div className={cn("flex gap-1.5 p-1 rounded-2xl bg-secondary/70 overflow-x-auto no-scrollbar shrink-0", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200",
            value === o.value
              ? `${activeClass} shadow-sm`
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="font-bold text-[15px] text-foreground">{title}</p>
        {desc && <p className="text-[13px] text-muted-foreground mt-1">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Labeled field wrapper ────────────────────────────────────
export function Field({
  label,
  children,
  required,
  className,
}: {
  label?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[13px] font-semibold text-foreground/80">
          {label} {required && <span className="text-expense">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

/** pill-style input like the mockups (white rounded field) */
export function PillInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      className={cn(
        "h-12 rounded-2xl bg-card border-border text-[14px] shadow-none",
        className
      )}
      {...props}
    />
  );
}

// ── Color dots picker ────────────────────────────────────────
export function ColorDots({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" dir="ltr">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
            value === c && "scale-110 ring-2 ring-offset-2 ring-offset-background"
          )}
          style={{ backgroundColor: c, boxShadow: value === c ? `0 0 0 2px ${c}` : undefined }}
          aria-label={`color ${c}`}
        >
          {value === c && <Check className="w-4 h-4 text-white" />}
        </button>
      ))}
    </div>
  );
}

// ── Gradient primary button ──────────────────────────────────
export function GradientButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      className={cn(
        "app-gradient text-white h-12 rounded-2xl text-[15px] font-bold w-full shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.99] transition-all",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

// ── Confirm dialog ───────────────────────────────────────────
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const f = useAppFormat();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[320px] rounded-3xl bg-card">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle className="text-[16px]">{title}</AlertDialogTitle>
          {description && <AlertDialogDescription className="text-[13px]">{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 justify-start">
          <AlertDialogAction
            onClick={onConfirm}
            className="flex-1 bg-expense text-white hover:bg-expense/90 rounded-xl h-10 text-[13px] font-bold m-0"
          >
            {confirmLabel ?? f.t("common.delete")}
          </AlertDialogAction>
          <AlertDialogCancel className="flex-1 rounded-xl h-10 text-[13px] font-bold m-0 bg-secondary">
            {cancelLabel ?? f.t("common.cancel")}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Jalali / Gregorian date picker ───────────────────────────
export function JalaliDatePicker({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  className?: string;
  placeholder?: string;
}) {
  const f = useAppFormat();
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<Date>(value ?? new Date());

  React.useEffect(() => {
    if (open) setAnchor(value ?? new Date());
  }, [open, value]);

  const days = React.useMemo(() => {
    if (f.calendar === "jalali") {
      const j = toJalali(anchor);
      const len = jalaliMonthLength(j.jy, j.jm);
      const first = toGregorian(j.jy, j.jm, 1);
      // Saturday-first offset: JS getDay() Sun=0..Sat=6 → sat index = (getDay()+1)%7
      const offset = (first.getDay() + 1) % 7;
      const cells: (Date | null)[] = [];
      for (let i = 0; i < offset; i++) cells.push(null);
      for (let d = 1; d <= len; d++) cells.push(toGregorian(j.jy, j.jm, d));
      return cells;
    }
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const len = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [anchor, f.calendar]);

  const monthTitle = React.useMemo(() => {
    if (f.calendar === "jalali") {
      const j = toJalali(anchor);
      return f.fa(`${JALALI_MONTH_NAMES[j.jm - 1]} ${j.jy}`);
    }
    return anchor.toLocaleDateString(f.lang === "fa" ? "fa-IR" : "en-US", { month: "long", year: "numeric" });
  }, [anchor, f]);

  const moveMonth = (dir: 1 | -1) => {
    if (f.calendar === "jalali") setAnchor(addJalaliMonths(anchor, dir));
    else {
      const d = new Date(anchor);
      d.setMonth(d.getMonth() + dir);
      setAnchor(d);
    }
  };

  const weekHeads = f.calendar === "jalali" ? WEEKDAY_SHORT_FA : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-12 w-full rounded-2xl bg-card border border-border px-4 flex items-center gap-2 text-[14px] text-foreground hover:bg-muted/40 transition-colors",
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? f.dateShort(value) : placeholder ?? f.t("common.select")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[290px] p-3 rounded-3xl bg-card card-soft" align="start" sideOffset={6}>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="next month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[14px] font-bold">{monthTitle}</span>
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
            aria-label="prev month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekHeads.map((w, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-muted-foreground py-1">
              {f.lang === "fa" ? w : w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const selected = value && isoDay(d) === isoDay(value);
            const isToday = isoDay(d) === isoDay(new Date());
            return (
              <button
                key={isoDay(d)}
                type="button"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                className={cn(
                  "h-9 rounded-xl text-[13px] font-medium transition-colors",
                  selected
                    ? "app-gradient text-white"
                    : isToday
                      ? "bg-secondary text-primary font-bold"
                      : "hover:bg-secondary"
                )}
              >
                {f.calendar === "jalali" ? f.fa(toJalali(d).jd) : f.fa(d.getDate())}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(new Date());
            setOpen(false);
          }}
          className="mt-2 w-full h-9 rounded-xl bg-secondary text-primary text-[13px] font-bold hover:bg-accent transition-colors"
        >
          {f.t("common.today")}
        </button>
      </PopoverContent>
    </Popover>
  );
}

// ── Month switcher (jalali aware) ────────────────────────────
export function MonthSwitcher({
  monthKey,
  onChange,
}: {
  monthKey: string; // "1403-07" jalali key
  onChange: (key: string) => void;
}) {
  const f = useAppFormat();
  const [y, m] = monthKey.split("-").map(Number);
  const move = (dir: 1 | -1) => {
    let ny = y;
    let nm = m + dir;
    if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    onChange(`${ny}-${String(nm).padStart(2, "0")}`);
  };
  return (
    <div className="flex items-center justify-between bg-card rounded-2xl border border-border px-2 py-1.5">
      <button
        onClick={() => move(-1)}
        className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
        aria-label="previous month"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <span className="text-[14px] font-bold">{jalaliMonthLabel(monthKey, f.lang)}</span>
      <button
        onClick={() => move(1)}
        className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
        aria-label="next month"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}

export { toEnDigits, parseJalaliInput };
