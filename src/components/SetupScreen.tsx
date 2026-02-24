import { useState } from "react";
import { ShieldAlert } from "lucide-react";

const GLASS =
  "rounded-3xl border border-border-subtle bg-secondary/80 backdrop-blur-glass";

interface SetupScreenProps {
  onGranted: (path: string) => void;
  onContinue?: () => void;
  canContinue?: boolean;
  checkingAccess?: boolean;
}

/**
 * Welcome / setup screen when Home directory is not readable (e.g. macOS permission).
 * "Grant Access" opens the folder dialog; selected path is passed to onGranted.
 */
export function SetupScreen({
  onGranted,
  onContinue,
  canContinue = false,
  checkingAccess = false,
}: SetupScreenProps) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  async function handleOpenFullDiskAccess() {
    const api = window.electron;
    if (!api?.openFullDiskAccessSettings) return;
    const opened = await api.openFullDiskAccessSettings();
    if (!opened) {
      setStatusMessage(
        "Unable to open System Settings automatically. Open Privacy & Security > Full Disk Access manually."
      );
      return;
    }
    setStatusMessage(
      "System Settings opened. Enable access for this app, then click 'I granted access'."
    );
  }

  async function handleRetryAccess() {
    const api = window.electron;
    if (!api?.getSystemPaths || !api?.checkAccess) return;
    setLoading(true);
    setStatusMessage("");
    try {
      const paths = await api.getSystemPaths();
      const hasHomeAccess = await api.checkAccess(paths.home);
      if (hasHomeAccess) {
        onGranted(paths.home);
        return;
      }
      setStatusMessage(
        "Access still not granted. Please enable Full Disk Access and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.07),transparent_35%),#0a0a0a]">
      <div
        className="absolute top-0 left-0 right-0 h-8"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      <div className={`flex w-full max-w-xs flex-col items-center gap-5 px-7 py-8 ${GLASS}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
          <ShieldAlert className="h-6 w-6 text-amber-300/90" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-white">Permission Required</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Allow Full Disk Access in System Settings so Nexus can scan your files.
          </p>
          {checkingAccess && (
            <p className="mt-2 text-xs text-white/40">Checking permission…</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={handleOpenFullDiskAccess}
            className="flex items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-200 transition-all duration-200 hover:bg-amber-500/18 hover:-translate-y-px [-webkit-app-region:no-drag]"
          >
            Open System Settings
          </button>
          <button
            type="button"
            onClick={() => {
              if (canContinue && onContinue) {
                onContinue();
                return;
              }
              void handleRetryAccess();
            }}
            disabled={loading || checkingAccess}
            className="rounded-2xl border border-white/10 bg-white/6 px-5 py-2.5 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/10 hover:-translate-y-px disabled:opacity-40 [-webkit-app-region:no-drag]"
          >
            {loading || checkingAccess
              ? "Checking…"
              : canContinue
                ? "Continue"
                : "I've Enabled Access"}
          </button>
        </div>
        {statusMessage && (
          <p className="text-center text-[11px] leading-snug text-amber-200/80">{statusMessage}</p>
        )}
      </div>
    </div>
  );
}
