import { useEffect, useMemo, useRef, useState } from "react";
import type { ScanResult } from "./types/fileScanner";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { ControlBar } from "./components/ControlBar";
import { ExplorerView } from "./components/ExplorerView";
import { DiskVisualizer } from "./components/DiskVisualizer";
import { SetupScreen } from "./components/SetupScreen";
import { Dashboard } from "./components/Dashboard";
import { BinView } from "./components/BinView";
import { useFileStore } from "./stores/useFileStore";
import type { DiskVizNode } from "./types/diskViz";
import { HelpCircle, Loader2, X } from "lucide-react";

const GLASS =
  "glass-surface rounded-3xl border border-border-subtle bg-secondary/80 backdrop-blur-glass";

function App() {
  const {
    currentPath,
    loadFavorites,
    favorites,
    navigateTo,
  } = useFileStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"explorer" | "dashboard">("explorer");
  const [showBin, setShowBin] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [vizData, setVizData] = useState<DiskVizNode | null>(null);
  const [vizLoading, setVizLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [permissionGateOpen, setPermissionGateOpen] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const [tourTargetRect, setTourTargetRect] = useState<DOMRect | null>(null);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);

  type TourStep = {
    title: string;
    description: string;
    getTarget?: () => HTMLElement | null;
    onEnter?: () => void;
  };

  const byTour = (id: string): HTMLElement | null =>
    document.querySelector(`[data-tour="${id}"]`);

  const tourSteps = useMemo(
    (): TourStep[] => [
      {
        title: "Sidebar overview",
        description:
          "This sidebar is your command center: pinned favorites, system locations, and bin access.",
        getTarget: () => byTour("sidebar-root"),
        onEnter: () => {
          setShowBin(false);
          setActiveTab("explorer");
        },
      },
      {
        title: "Favorites (quick access)",
        description:
          "Pin folders for faster navigation. You can drag to reorder and right-click a favorite to remove it.",
        getTarget: () => byTour("sidebar-favorites"),
      },
      {
        title: "Locations",
        description:
          "These are default system paths like Home, Desktop, Downloads, and Music.",
        getTarget: () => byTour("sidebar-locations"),
      },
      {
        title: "Trash / Bin",
        description:
          "Deleted files are moved to Bin first, so you can restore or permanently delete later.",
        getTarget: () => byTour("sidebar-bin"),
      },
      {
        title: "Control bar navigation",
        description:
          "Use Back, Forward, Up and the search box to quickly navigate and filter the current folder.",
        getTarget: () => byTour("control-bar"),
        onEnter: () => {
          setShowBin(false);
          setActiveTab("explorer");
        },
      },
      {
        title: "Switch between views",
        description:
          "Use these tabs to switch between Files view and Auto Organize Summary dashboard.",
        getTarget: () => byTour("main-tabs"),
      },
      {
        title: "Explorer tools",
        description:
          "Toggle Grid/List view and sort by name, date modified, or size.",
        getTarget: () => byTour("explorer-toolbar"),
      },
      {
        title: "File explorer",
        description:
          "Single-click selects an item, double-click opens it. Right-click items to rename, trash, or favorite folders.",
        getTarget: () => byTour("explorer-content"),
      },
      {
        title: "Quick Look preview",
        description:
          "Select a file and press Space to open Quick Look. Great for fast preview of media and code.",
        getTarget: () => byTour("explorer-content"),
      },
      {
        title: "Disk usage map",
        description:
          "This chart shows how storage is distributed. Hover segments for details and click folder segments for deeper scans.",
        getTarget: () => byTour("disk-visualizer"),
      },
      {
        title: "Dashboard summary",
        description:
          "Now switching to the Auto Organize Summary tab where category cards show file distribution.",
        getTarget: () => byTour("dashboard-categories"),
        onEnter: () => {
          setShowBin(false);
          setActiveTab("dashboard");
        },
      },
      {
        title: "Category drill-down",
        description:
          "Click any category card to reveal the files table and open matching files directly.",
        getTarget: () => byTour("dashboard-root"),
      },
      {
        title: "Bin management",
        description:
          "Now switching to Bin view. Restore files, delete permanently, or empty the entire bin.",
        getTarget: () => byTour("bin-header"),
        onEnter: () => {
          setShowBin(true);
          setActiveTab("explorer");
        },
      },
      {
        title: "Help anytime",
        description:
          "Click this ? button whenever you need a quick refresher or want to replay the guided tour.",
        getTarget: () => helpButtonRef.current,
        onEnter: () => {
          setShowBin(false);
          setActiveTab("explorer");
        },
      },
    ],
    []
  );
  const [accessState, setAccessState] = useState<{
    checked: boolean;
    hasAccess: boolean;
  }>({ checked: false, hasAccess: false });
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Exit bin view whenever the user navigates somewhere
  useEffect(() => {
    if (currentPath) setShowBin(false);
  }, [currentPath]);

  useEffect(() => {
    if (
      favorites.length === 0 ||
      !currentPath ||
      accessState.checked ||
      !window.electron?.checkAccess
    )
      return;
    window.electron.checkAccess(currentPath).then((ok) => {
      setAccessState({ checked: true, hasAccess: ok });
    });
  }, [favorites.length, currentPath, accessState.checked]);

  useEffect(() => {
    if (!currentPath || !window.electron?.scanDirectoryForViz) return;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      setVizLoading(true);
      setVizData(null);
      window.electron
        .scanDirectoryForViz(currentPath, 2)
        .then((data) => { if (!cancelled) setVizData(data); })
        .catch(() => { if (!cancelled) setVizData(null); })
        .finally(() => { if (!cancelled) setVizLoading(false); });

      if (activeTab === "dashboard" && window.electron?.scanDirectory) {
        setScanLoading(true);
        window.electron
          .scanDirectory(currentPath, 2)
          .then((result) => { if (!cancelled) setScanResult(result); })
          .catch(() => { if (!cancelled) setScanResult(null); })
          .finally(() => { if (!cancelled) setScanLoading(false); });
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentPath, activeTab]);

  const handleDeepScan = (path: string) => {
    if (!window.electron?.scanDirectoryForViz) return;
    const api = window.electron;
    setVizLoading(true);
    setVizData(null);
    const task = api.scanDirectoryForVizDeep
      ? api.scanDirectoryForVizDeep(path)
      : api.scanDirectoryForViz(path, 6);
    task
      .then(setVizData)
      .catch(() => setVizData(null))
      .finally(() => setVizLoading(false));
  };

  const handleGrantedAccess = (path: string) => {
    navigateTo(path);
    setAccessState((s) => ({ ...s, hasAccess: true }));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!tourOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTourOpen(false);
      if (e.key === "ArrowRight") {
        setTourStep((s) => Math.min(s + 1, tourSteps.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setTourStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tourOpen, tourSteps.length]);

  useEffect(() => {
    if (!tourOpen) return;
    tourSteps[tourStep]?.onEnter?.();
  }, [tourOpen, tourStep, tourSteps]);

  useEffect(() => {
    if (!tourOpen) {
      setTourTargetRect(null);
      return;
    }
    const updateRect = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = tourSteps[tourStep]?.getTarget?.();
          if (!target) {
            setTourTargetRect(null);
            return;
          }
          setTourTargetRect(target.getBoundingClientRect());
        });
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [tourOpen, tourStep, tourSteps]);

  const startTour = () => {
    setHelpOpen(false);
    setShowBin(false);
    setActiveTab("explorer");
    setTourStep(0);
    setTourOpen(true);
  };

  if (favorites.length === 0) {
    return (
      <Layout sidebarContent={<Sidebar activeBin={showBin} onBinClick={() => setShowBin(true)} />}>
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      </Layout>
    );
  }

  if (permissionGateOpen || (accessState.checked && !accessState.hasAccess)) {
    return (
      <SetupScreen
        onGranted={(path) => {
          handleGrantedAccess(path);
          setPermissionGateOpen(false);
        }}
        onContinue={() => setPermissionGateOpen(false)}
        canContinue={accessState.checked && accessState.hasAccess}
        checkingAccess={!accessState.checked}
      />
    );
  }

  return (
    <Layout sidebarContent={<Sidebar activeBin={showBin} onBinClick={() => setShowBin(true)} />}>
      {showBin ? (
        <div className="flex flex-col gap-4 p-6 h-full">
          <BinView />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-6 h-full">
          <ControlBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Navigation Tabs */}
          <div
            data-tour="main-tabs"
            className="glass-surface flex items-center gap-1 rounded-2xl border border-border-subtle bg-secondary/80 p-1.5 backdrop-blur-glass w-fit"
          >
            <button
              onClick={() => setActiveTab("explorer")}
              className={`px-4 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === "explorer" ? "bg-white/15 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === "dashboard" ? "bg-white/15 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
            >
              Auto Organize Summary
            </button>
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            {activeTab === "explorer" ? (
              <>
                <div className="flex min-w-0 flex-[7] flex-col overflow-auto">
                  <ExplorerView searchQuery={searchQuery} />
                </div>
                <div className="flex min-w-0 flex-[3] flex-col overflow-hidden">
                  <div className={`flex min-h-[360px] flex-col ${GLASS} p-4`}>
                    <h2 className="mb-2 text-sm font-medium text-white/70">
                      Disk usage
                    </h2>
                    {vizLoading && (
                      <div className="flex flex-1 items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                        <span className="text-sm text-white/60">Building disk map…</span>
                      </div>
                    )}
                    {!vizLoading && vizData && (
                      <DiskVisualizer
                        data={vizData}
                        isLoading={false}
                        onDeepScan={handleDeepScan}
                      />
                    )}
                    {!vizLoading && !vizData && (
                      <p className="flex flex-1 items-center justify-center text-sm text-white/50">
                        No disk data
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-auto w-full">
                <Dashboard
                  result={scanResult}
                  vizData={vizData}
                  vizLoading={vizLoading}
                  loading={scanLoading}
                  error={null}
                  directoryPath={currentPath}
                />
              </div>
            )}
          </div>
        </div>
      )}
      <button
        ref={helpButtonRef}
        type="button"
        onClick={() => setHelpOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/20 text-cyan-100 shadow-[0_8px_24px_rgba(6,182,212,0.35)] backdrop-blur-glass transition duration-200 hover:scale-105 hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        title="How to use this app"
        aria-label="Open help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="glass-surface w-full max-w-2xl rounded-3xl border border-border-subtle bg-secondary/95 p-5 shadow-2xl backdrop-blur-glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Welcome to Nexus</h2>
                <p className="mt-1 text-sm text-white/70">
                  A desktop file organizer and disk usage visualizer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                aria-label="Close help"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 text-sm text-white/80 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <h3 className="mb-1 font-medium text-white">What you can do</h3>
                <ul className="space-y-1 text-white/70">
                  <li>- Browse files in grid or list view</li>
                  <li>- Search and sort current folder items</li>
                  <li>- Add frequent folders to Favorites</li>
                  <li>- Open Quick Look with the Space key</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <h3 className="mb-1 font-medium text-white">Disk visualization</h3>
                <ul className="space-y-1 text-white/70">
                  <li>- Right panel shows folder size breakdown</li>
                  <li>- Hover segments to inspect file/folder size</li>
                  <li>- Click a folder segment for deeper scan</li>
                  <li>- Use Dashboard for category-wise summary</li>
                </ul>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-xs text-cyan-100/90">
              Built for Operating Systems concepts: process separation (main/renderer), IPC communication, and worker-thread scanning for responsiveness.
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={startTour}
                className="rounded-2xl border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-100 transition duration-200 hover:bg-cyan-500/30 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Start guided walkthrough
              </button>
            </div>
          </div>
        </div>
      )}
      {tourOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/65" />
          {tourTargetRect && (
            <div
              className="pointer-events-none fixed rounded-2xl border border-cyan-300/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.68),0_0_0_2px_rgba(34,211,238,0.5),0_0_30px_rgba(34,211,238,0.35)]"
              style={{
                top: tourTargetRect.top - 8,
                left: tourTargetRect.left - 8,
                width: tourTargetRect.width + 16,
                height: tourTargetRect.height + 16,
              }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-border-subtle bg-secondary/95 shadow-2xl backdrop-blur-glass">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/60">
                  STEP {tourStep + 1} OF {tourSteps.length}
                </p>
                <button
                  type="button"
                  onClick={() => setTourOpen(false)}
                  className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-4">
                <h3 className="text-xl font-semibold text-white">
                  {tourSteps[tourStep].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {tourSteps[tourStep].description}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setTourStep((s) => Math.max(0, s - 1))}
                  disabled={tourStep === 0}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <div className="flex items-center gap-1.5">
                  {tourSteps.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full ${idx === tourStep ? "bg-white" : "bg-white/30"}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (tourStep === tourSteps.length - 1) {
                      setTourOpen(false);
                      return;
                    }
                    setTourStep((s) => Math.min(s + 1, tourSteps.length - 1));
                  }}
                  className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30"
                >
                  {tourStep === tourSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
