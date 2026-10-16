"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useAppFormat,
  ScreenHeader,
  SegmentedTabs,
  ProgressBar,
  EmptyState,
} from "@/components/app/ui";
import { useReports } from "@/lib/hooks";
import {
  WEEKDAY_SHORT_FA,
  WEEKDAY_NAMES_EN,
  jalaliMonthLabel,
} from "@/lib/jalali";
import { formatMoneyShort } from "@/lib/format";
import type { ReportPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

const INCOME_COLOR = "#4E9B72";
const EXPENSE_COLOR = "#F0A868";
const OTHER_COLOR = "#A78BCA";

// ── chart tooltip ────────────────────────────────────────────
function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; dataKey?: string }[];
  label?: string;
}) {
  const f = useAppFormat();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-xl card-soft px-3 py-2 flex flex-col gap-1 border border-border/60">
      <span className="text-[11px] font-bold text-foreground">{label}</span>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-[11px]">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: p.dataKey === "income" ? INCOME_COLOR : EXPENSE_COLOR }}
          />
          <span className={cn(p.dataKey === "income" ? "text-income" : "text-expense", "font-bold")}>
            {formatMoneyShort(p.value ?? 0, f.lang)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const [period, setPeriod] = React.useState<ReportPeriod>("monthly");
  const { data: r, isLoading } = useReports(period);

  // label mapping per period
  const seriesData = (r?.series ?? []).map((s) => {
    let label = s.label;
    if (period === "monthly") {
      // "1405-02" → "مهر" / "Mehr"
      label = jalaliMonthLabel(s.label, f.lang).split(" ")[0] ?? s.label;
    } else if (period === "daily" || period === "weekly") {
      const wd = (new Date(s.label).getDay() + 1) % 7;
      label = f.lang === "fa" ? WEEKDAY_SHORT_FA[wd] : (WEEKDAY_NAMES_EN[wd] ?? s.label);
    } else {
      label = f.fa(s.label);
    }
    return { label, income: s.income, expense: s.expense };
  });

  const isEmpty =
    !!r && r.series.every((s) => s.income === 0 && s.expense === 0) && r.income === 0 && r.expense === 0;

  // donut data: top 5 + other
  const donutData = React.useMemo(() => {
    if (!r) return [];
    const top = r.categories.slice(0, 5).map((c) => ({
      name: c.name,
      total: c.total,
      percent: c.percent,
      color: c.color,
    }));
    const rest = r.categories.slice(5);
    const otherTotal = rest.reduce((a, c) => a + c.total, 0);
    if (otherTotal > 0) {
      top.push({
        name: f.t("rep.other"),
        total: otherTotal,
        percent: rest.reduce((a, c) => a + c.percent, 0),
        color: OTHER_COLOR,
      });
    }
    return top;
  }, [r, f]);

  const netDisplay = (net: number) =>
    net < 0 ? `−${f.money(Math.abs(net), false)}` : f.money(net, false);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={f.t("rep.title")} />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-4">
        {/* ── Period tabs ── */}
        <SegmentedTabs
          value={period}
          onChange={(v) => setPeriod(v)}
          options={[
            { value: "daily" as ReportPeriod, label: f.t("rep.daily") },
            { value: "weekly" as ReportPeriod, label: f.t("rep.weekly") },
            { value: "monthly" as ReportPeriod, label: f.t("rep.monthly") },
            { value: "yearly" as ReportPeriod, label: f.t("rep.yearly") },
          ]}
        />

        {isLoading || !r ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="animate-pulse bg-secondary rounded-2xl h-16" />
              <div className="animate-pulse bg-secondary rounded-2xl h-16" />
              <div className="animate-pulse bg-secondary rounded-2xl h-16" />
            </div>
            <div className="animate-pulse bg-secondary rounded-2xl h-52" />
            <div className="animate-pulse bg-secondary rounded-2xl h-52" />
          </>
        ) : (
          <>
            {/* ── Summary ── */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-income-soft rounded-2xl p-3 text-center">
                <p className="text-[11px] text-income/80">{f.t("rep.income")}</p>
                <p className="num-input text-[13px] font-bold text-income mt-1" dir="ltr">
                  {f.money(r.income, false)}
                </p>
              </div>
              <div className="bg-expense-soft rounded-2xl p-3 text-center">
                <p className="text-[11px] text-expense/80">{f.t("rep.expense")}</p>
                <p className="num-input text-[13px] font-bold text-expense mt-1" dir="ltr">
                  {f.money(r.expense, false)}
                </p>
              </div>
              <div className="bg-secondary/60 rounded-2xl p-3 text-center">
                <p className="text-[11px] text-muted-foreground">{f.t("rep.net")}</p>
                <p
                  className={cn(
                    "num-input text-[13px] font-bold mt-1",
                    r.net < 0 ? "text-expense" : "text-primary"
                  )}
                  dir="ltr"
                >
                  {netDisplay(r.net)}
                </p>
              </div>
            </div>

            {isEmpty ? (
              <div className="bg-card rounded-3xl card-soft">
                <EmptyState icon={<BarChart3 className="w-7 h-7" />} title={f.t("rep.noData")} />
              </div>
            ) : (
              <>
                {/* ── Income vs Expense ── */}
                <div className="bg-card rounded-3xl p-4 card-soft">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-[14px] text-foreground">
                      {f.t("rep.incomeVsExpense")}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INCOME_COLOR }} />
                        {f.t("rep.income")}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EXPENSE_COLOR }} />
                        {f.t("rep.expense")}
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={seriesData} barGap={2}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        reversed={f.lang === "fa"}
                      />
                      <YAxis width={0} axisLine={false} tickLine={false} />
                      <RTooltip content={<MoneyTooltip />} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
                      <Bar dataKey="income" fill={INCOME_COLOR} radius={[6, 6, 0, 0]} maxBarSize={16} />
                      <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Expense distribution (donut) ── */}
                {r.categories.length > 0 && (
                  <div className="bg-card rounded-3xl p-4 card-soft">
                    <p className="font-bold text-[14px] text-foreground mb-2">
                      {f.t("rep.expenseDistribution")}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="relative w-[132px] h-[132px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              dataKey="total"
                              nameKey="name"
                              innerRadius="62%"
                              outerRadius="90%"
                              paddingAngle={3}
                              stroke="none"
                            >
                              {donutData.map((c) => (
                                <Cell key={c.name} fill={c.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-muted-foreground">{f.t("rep.expense")}</span>
                          <span className="num-input text-[13px] font-extrabold text-foreground">
                            {formatMoneyShort(r.expense, f.lang)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        {donutData.map((c) => (
                          <div key={c.name} className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <span className="text-[12px] font-semibold text-foreground truncate flex-1">
                              {c.name}
                            </span>
                            <span className="num-input text-[11px] text-muted-foreground shrink-0" dir="ltr">
                              {f.fa(c.percent)}% • {f.money(c.total, false)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Top spending ── */}
                {r.categories.length > 0 && (
                  <div className="bg-card rounded-3xl p-4 card-soft flex flex-col gap-3">
                    <p className="font-bold text-[14px] text-foreground">{f.t("rep.topCategories")}</p>
                    {r.categories.slice(0, 5).map((c, i) => (
                      <div key={c.categoryId} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-6 h-6 rounded-full bg-secondary text-[11px] font-bold text-foreground flex items-center justify-center shrink-0"
                          >
                            {f.fa(i + 1)}
                          </span>
                          <span className="text-[13px] font-semibold text-foreground flex-1 truncate">
                            {c.name}
                          </span>
                          <span className="num-input text-[12px] font-bold text-expense shrink-0" dir="ltr">
                            {f.money(c.total, false)}
                          </span>
                        </div>
                        <ProgressBar value={c.percent} fixedColor={c.color} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── By account ── */}
                {r.accounts.length > 0 && (
                  <div className="bg-card rounded-3xl p-4 card-soft">
                    <p className="font-bold text-[14px] text-foreground mb-1">{f.t("rep.byAccount")}</p>
                    <div className="flex flex-col divide-y divide-border/50">
                      {r.accounts.map((a) => (
                        <div key={a.accountId} className="flex items-center gap-3 py-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: a.color }}
                          />
                          <span className="text-[13px] font-semibold text-foreground flex-1 truncate">
                            {a.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="num-input text-[11px] font-bold text-income" dir="ltr">
                              +{f.money(a.income, false)}
                            </span>
                            <span className="num-input text-[11px] font-bold text-expense" dir="ltr">
                              −{f.money(a.expense, false)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
