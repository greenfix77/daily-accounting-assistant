"use client";

import * as React from "react";
import {
  UserRound,
  ShieldCheck,
  Bell,
  Info,
  LogOut,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useSettings, useUpdateSettings } from "@/lib/hooks";
import { useAppFormat, ScreenHeader, PillInput, GradientButton, ConfirmDialog } from "@/components/app/ui";
import { toEnDigits } from "@/lib/jalali";

// ── local building blocks (duplicated on purpose) ────────────
function Row({
  icon: Icon,
  title,
  sub,
  destructive,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  const color = destructive ? "#E5757A" : "#4E9B72";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl px-4 py-3.5 card-soft flex items-center gap-3 w-full text-start",
        onClick && "hover:bg-accent/40 active:scale-[0.99] transition-all cursor-pointer"
      )}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            "block font-semibold text-[14px] truncate",
            destructive ? "text-expense" : "text-foreground"
          )}
        >
          {title}
        </span>
        {sub && <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{sub}</span>}
      </span>
      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function ProfileScreen({ params }: { params?: Record<string, unknown> }) {
  void params;
  const f = useAppFormat();
  const { back, push, setAuthed, popToRoot } = useAppStore();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const [infoOpen, setInfoOpen] = React.useState(false);
  const [secOpen, setSecOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [pin2, setPin2] = React.useState("");
  const [pinMode, setPinMode] = React.useState(false); // showing PIN inputs to set a new PIN

  React.useEffect(() => {
    if (settings) {
      setName(settings.name);
      setEmail(settings.email);
    }
  }, [settings]);

  const lockOn = !!settings?.appLock;

  const openSecurity = () => {
    setPinMode(false);
    setPin("");
    setPin2("");
    setSecOpen(true);
  };

  const onLockToggle = (v: boolean) => {
    if (v) {
      if (settings?.pin) {
        updateSettings.mutate({ appLock: true });
      } else {
        setPinMode(true);
      }
    } else {
      setPinMode(false);
      updateSettings.mutate({ appLock: false, pin: null });
    }
  };

  const savePin = async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error(f.t("set.enterPin"));
      return;
    }
    if (pin !== pin2) {
      toast.error(f.t("set.pinMismatch"));
      return;
    }
    await updateSettings.mutateAsync({ appLock: true, pin });
    toast.success(f.t("set.pinSet"));
    setSecOpen(false);
  };

  const saveInfo = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error(f.t("common.required"));
      return;
    }
    await updateSettings.mutateAsync({ name: name.trim(), email: email.trim() });
    toast.success(f.t("prof.updated"));
    setInfoOpen(false);
  };

  const doLogout = async () => {
    await updateSettings.mutateAsync({ onboarded: false, appLock: false, pin: null });
    setAuthed(false);
    popToRoot();
    toast.success(f.t("auth.logoutSuccess"));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <ScreenHeader title={f.t("prof.title")} onBack={back} />

      <div className="flex-1 overflow-y-auto app-screen-scroll px-4 pb-8 pt-2 flex flex-col gap-4">
        {/* Header card */}
        <div className="flex flex-col items-center gap-1.5 pt-4 pb-2">
          <img
            src="/images/avatar.png"
            alt={settings?.name ?? ""}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/15"
          />
          <p className="font-bold text-[16px] text-foreground mt-1">{settings?.name}</p>
          <p className="text-[13px] text-muted-foreground" dir="ltr">
            {settings?.email}
          </p>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-2.5">
          <Row
            icon={UserRound}
            title={f.t("prof.personalInfo")}
            sub={settings?.email}
            onClick={() => setInfoOpen(true)}
          />
          <Row
            icon={ShieldCheck}
            title={f.t("prof.security")}
            sub={f.t("prof.securityDesc")}
            onClick={openSecurity}
          />
          <Row
            icon={Bell}
            title={f.t("prof.alerts")}
            sub={f.t("prof.alertsDesc")}
            onClick={() => push("reminders")}
          />
          <Row
            icon={Info}
            title={f.t("prof.aboutApp")}
            sub={f.t("prof.aboutAppDesc")}
            onClick={() => push("about")}
          />
          <Row
            icon={LogOut}
            title={f.t("auth.logout")}
            destructive
            onClick={() => setLogoutOpen(true)}
          />
        </div>
      </div>

      {/* Personal info dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-start">{f.t("prof.editInfo")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-1">
            <PillInput
              type="text"
              placeholder={f.t("prof.yourName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <PillInput
              type="text"
              inputMode="email"
              dir="ltr"
              placeholder={f.t("prof.yourEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <GradientButton onClick={saveInfo} className="h-11 text-[14px]">
              {f.t("common.save")}
            </GradientButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security dialog */}
      <Dialog open={secOpen} onOpenChange={setSecOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-start">{f.t("prof.security")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between bg-secondary/60 rounded-2xl px-4 py-3">
              <span className="text-[13px] font-semibold text-foreground">{f.t("set.appLock")}</span>
              <Switch checked={lockOn || pinMode} onCheckedChange={onLockToggle} />
            </div>
            {pinMode && (
              <>
                <PillInput
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={4}
                  placeholder={f.t("set.enterPin")}
                  value={pin}
                  onChange={(e) => setPin(toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 4))}
                  className="text-center tracking-[0.5em]"
                />
                <PillInput
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={4}
                  placeholder={f.t("set.confirmPin")}
                  value={pin2}
                  onChange={(e) => setPin2(toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 4))}
                  className="text-center tracking-[0.5em]"
                />
                <GradientButton onClick={savePin} className="h-11 text-[14px]">
                  {f.t("common.save")}
                </GradientButton>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout confirm */}
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={doLogout}
        title={f.t("auth.logoutConfirm")}
        confirmLabel={f.t("auth.logout")}
      />
    </div>
  );
}
