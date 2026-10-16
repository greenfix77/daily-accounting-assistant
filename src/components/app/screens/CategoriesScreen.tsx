"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Tags, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useCategories, useDeleteCategory } from "@/lib/hooks";
import type { CategoryDTO, CategoryType } from "@/lib/types";
import {
  useAppFormat,
  ScreenHeader,
  EmptyState,
  SegmentedTabs,
  IconBubble,
  GradientButton,
  ConfirmDialog,
} from "@/components/app/ui";

export default function CategoriesScreen({ params }: { params?: Record<string, unknown> }) {
  const f = useAppFormat();
  const push = useAppStore((s) => s.push);
  const back = useAppStore((s) => s.back);

  const paramType: CategoryType | undefined =
    params?.type === "INCOME" ? "INCOME" : params?.type === "EXPENSE" ? "EXPENSE" : undefined;
  const [type, setType] = React.useState<CategoryType>(paramType ?? "EXPENSE");

  const { data: cats, isLoading } = useCategories(type, true);
  const del = useDeleteCategory();
  const [toDelete, setToDelete] = React.useState<CategoryDTO | null>(null);

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await del.mutateAsync(target.id);
      toast.success(f.t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : f.t("common.error"));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader
        title={f.t("cat.title")}
        onBack={back}
        right={
          <button
            type="button"
            onClick={() => push("category-form", { type })}
            aria-label={f.t("cat.add")}
            className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
        <SegmentedTabs
          options={[
            { value: "EXPENSE" as CategoryType, label: f.t("tx.expense") },
            { value: "INCOME" as CategoryType, label: f.t("tx.income") },
          ]}
          value={type}
          onChange={(v) => setType(v)}
        />

        {isLoading ? (
          <>
            <div className="h-[72px] rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="h-[72px] rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="h-[72px] rounded-2xl bg-secondary/50 animate-pulse" />
          </>
        ) : (cats?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Tags className="w-7 h-7" />}
            title={f.t("cat.empty")}
            action={
              <GradientButton
                onClick={() => push("category-form", { type })}
                className="w-auto px-8"
              >
                {f.t("cat.add")}
              </GradientButton>
            }
          />
        ) : (
          (cats ?? []).map((c) => (
            <div key={c.id} className="bg-card rounded-2xl card-soft p-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => push("category-form", { id: c.id, type })}
                className="flex-1 min-w-0 flex items-center gap-3 text-right"
              >
                <IconBubble icon={c.icon} color={c.color} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px] text-foreground truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {f.t("cat.monthSpent")}: <span className="num-input">{f.money(c.spent ?? 0)}</span>
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setToDelete(c)}
                aria-label={f.t("common.delete")}
                className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-expense hover:bg-expense-soft transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        onConfirm={handleDelete}
        title={f.t("cat.deleteConfirm")}
      />
    </div>
  );
}
