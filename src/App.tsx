import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import type { ScanResult } from "./types/fileScanner";
import { FolderOpen } from "lucide-react";

const GLASS_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-3xl border border-border-subtle bg-secondary/80 py-3 px-4 text-sm font-medium text-white backdrop-blur-glass transition hover:bg-secondary hover:border-white/20";

function App() {
  const [directoryPath, setDirectoryPath] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectFolder() {
    const api = window.electron;
    if (!api?.selectDirectory || !api?.scanDirectory) return;
    setError(null);
    const path = await api.selectDirectory();
    if (path == null) return;
    setDirectoryPath(path);
    setLoading(true);
    try {
      const scanResult = await api.scanDirectory(path);
      setResult(scanResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleSelectFolder}
        disabled={loading}
        className={GLASS_BUTTON}
      >
        <FolderOpen className="h-4 w-4 shrink-0" />
        Select Folder
      </button>
      {directoryPath && (
        <p className="truncate text-xs text-white/50" title={directoryPath}>
          {directoryPath}
        </p>
      )}
    </div>
  );

  return (
    <Layout sidebarContent={sidebarContent}>
      <Dashboard
        directoryPath={directoryPath}
        result={result}
        loading={loading}
        error={error}
      />
    </Layout>
  );
}

export default App;
