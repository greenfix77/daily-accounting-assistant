"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useCategories, useSaveCategory, useDeleteCategory } from "@/lib/hooks";
import type { CategoryType } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  useAppFormat,
  ScreenHeader,
  Field,
  PillInput,
  SegmentedTabs,
  GradientButton,
  ConfirmDialog,
  ColorDots,
} from "@/components/app/ui";
import { ICON_NAMES, COLOR_PALETTE, getIcon } from "@/components/app/icons";

export default function CategoryFormScreen({ params }: { params?: Record<string, unknown> }) {
  const f = useAppFormat();
  const back = useAppStore((s) => s.back);
  const id = typeof params?.id === "string" ? params.id : undefined;
  const isEdit = !!id;
  const paramType: CategoryType | undefined =
    params?.type === "INCOME" ? "INCOME" : params?.type === "EXPENSE" ? "EXPENSE" : undefined;

  const { data: allCats, isLoading } = useCategories();
  const category = React.useMemo(() => allCats?.find((c) => c.id === id), [allCats, id]);

  const save = useSaveCategory();
  const del = useDeleteCategory();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CategoryType>(paramType ?? "EXPENSE");
  const [icon, setIcon] = React.useState("tag");
  const [color, setColor] = React.useState(COLOR_PALETTE[0]);
  const [hydratedId, setHydratedId] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (category && hydratedId !== category.id) {
      setName(category.name);
      setType(category.type);
      setIcon(category.icon || "tag");
      setColor(category.color || COLOR_PALETTE[0]);
      setHydratedId(category.id);
    }
  }, [category, hydratedId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    try {
      await save.mutateAsync({
        id,
        name: name.trim(),
        type,
        color,
        icon,
      });
      toast.success(f.t("common.saved"));
      back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : f.t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setConfirmDelete(false);
    try {
      await del.mutateAsync(id);
      toast.success(f.t("common.deleted"));
      back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : f.t("common.error"));
    }
  };

  if (isEdit && !category && isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        <ScreenHeader title={f.t("cat.editTitle")} onBack={back} />
        <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-3">
          <div className="h-12 rounded-2xl bg-secondary/50 animate-pulse" />
          <div className="h-14 rounded-2xl bg-secondary/50 animate-pulse" />
          <div className="h-24 rounded-2xl bg-secondary/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={isEdit ? f.t("cat.editTitle") : f.t("cat.addTitle")} onBack={back} />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-4">
        <div className="bg-card rounded-2xl card-soft p-4 flex flex-col gap-4">
          {/* name */}
          <Field label={f.t("cat.name")} required>
            <PillInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={f.t("cat.namePlaceholder")}
            />
          </Field>

          {/* type — only editable in add mode */}
          {isEdit ? (
            <Field label={f.t("cat.catType")}>
              <div className="h-12 rounded-2xl bg-secondary/60 flex items-center px-4">
                <span className="text-[13px] font-semibold text-foreground">
                  {type === "INCOME" ? f.t("tx.income") : f.t("tx.expense")}
                </span>
              </div>
            </Field>
          ) : (
            <Field label={f.t("cat.catType")}>
              <SegmentedTabs
                options={[
                  { value: "EXPENSE" as CategoryType, label: f.t("tx.expense") },
                  { value: "INCOME" as CategoryType, label: f.t("tx.income") },
                ]}
                value={type}
                onChange={(v) => setType(v)}
                activeClass="bg-primary text-white"
              />
            </Field>
          )}

          {/* color */}
          <Field label={f.t("cat.color")}>
            <ColorDots colors={COLOR_PALETTE} value={color} onChange={setColor} />
          </Field>
        </div>

        {/* icon grid */}
        <div className="bg-card rounded-2xl card-soft p-4">
          <Field label={f.t("cat.icon")}>
            <div className="grid grid-cols-6 gap-2">
              {ICON_NAMES.map((ic) => {
                const Icon = getIcon(ic);
                const active = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    aria-label={ic}
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center transition-all",
                      active
                        ? "text-white ring-2 ring-offset-1 ring-primary scale-105"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                    style={active ? { backgroundColor: color } : undefined}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        {/* save */}
        <GradientButton onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "..." : f.t("common.save")}
        </GradientButton>

        {/* delete (edit only) */}
        {isEdit && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={del.isPending}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-expense-soft text-expense text-[14px] font-bold hover:bg-expense/10 active:scale-[0.99] transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {f.t("common.delete")}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
        title={f.t("cat.deleteConfirm")}
      />
    </div>
  );
}
