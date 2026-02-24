import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  sidebarContent?: ReactNode;
}

/**
 * Root layout with sidebar and main content. Includes a drag region at the top
 * of the sidebar for moving the frameless window on macOS.
 */
export function Layout({ children, sidebarContent }: LayoutProps) {
  return (
    <div className="flex h-screen w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.07),transparent_35%),#0a0a0a] text-white">
      <aside className="glass-surface flex w-[268px] flex-col border-r border-white/10 rounded-r-3xl">
        <div
          className="h-8 shrink-0 px-4"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 [-webkit-app-region:no-drag]">
          {sidebarContent}
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-main/55 transition-all duration-300">{children}</main>
    </div>
  );
}
