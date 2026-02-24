import {
  Home,
  Monitor,
  Download,
  Music,
  Folder,
  Star,
  FolderGit2,
  Book,
  HardDrive,
  Trash2,
  FolderPlus,
} from "lucide-react";
import {
  useFileStore,
  type SidebarFavorite,
} from "../stores/useFileStore";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

const FAVORITE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Desktop: Monitor,
  Downloads: Download,
  Music,
};

function iconForSidebar(f: SidebarFavorite) {
  switch (f.icon) {
    case "download":
      return Download;
    case "music":
      return Music;
    case "monitor":
      return Monitor;
    case "file-text":
      return Book;
    case "folder-git-2":
      return FolderGit2;
    default:
      return Folder;
  }
}

function SidebarFavoriteRow({ item }: { item: SidebarFavorite }) {
  const { currentPath, navigateTo, removeFavorite } = useFileStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = iconForSidebar(item);
  const isActive = currentPath === item.path;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    removeFavorite(item.id);
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => navigateTo(item.path)}
      onContextMenu={handleContextMenu}
      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs [-webkit-app-region:no-drag] ${isActive
          ? "rounded-2xl bg-blue-500/80 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_8px_18px_rgba(59,130,246,0.25)]"
          : "rounded-2xl text-white/80 hover:bg-white/8"
        } ${isDragging ? "opacity-80" : ""}`}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{item.name}</span>
    </button>
  );
}

interface SidebarProps {
  activeBin?: boolean;
  onBinClick?: () => void;
}

/**
 * Finder-style sidebar with customizable Favorites (drag-reorder),
 * plus static Locations and a Bin entry.
 */
export function Sidebar({ activeBin, onBinClick }: SidebarProps) {
  const {
    favorites,
    sidebarFavorites,
    currentPath,
    navigateTo,
    reorderFavorites,
  } = useFileStore();

  const [binCount, setBinCount] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFolderLoading, setCreateFolderLoading] = useState(false);
  const [folderName, setFolderName] = useState("New Folder");
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    window.electron?.listTrashItems?.().then((items) => {
      setBinCount(items?.length ?? 0);
    });
  }, [activeBin]);

  useEffect(() => {
    if (!createDialogOpen) return;
    const timer = window.setTimeout(() => {
      folderInputRef.current?.focus();
      folderInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [createDialogOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (favorites.length === 0) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sidebarFavorites.findIndex((f) => f.id === active.id);
    const newIndex = sidebarFavorites.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderFavorites(oldIndex, newIndex);
  };

  const handleLocationClick = (itemPath: string) => {
    navigateTo(itemPath);
  };

  const beginCreateFolder = () => {
    if (!currentPath) return;
    setFolderName("New Folder");
    setCreateDialogOpen(true);
  };

  const cancelCreateFolder = () => {
    if (createFolderLoading) return;
    setCreateDialogOpen(false);
    setFolderName("New Folder");
  };

  const submitCreateFolder = async () => {
    if (!currentPath || !window.electron?.createFolder || createFolderLoading) return;
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      alert("Folder name cannot be empty.");
      return;
    }

    setCreateFolderLoading(true);
    const ok = await window.electron.createFolder(currentPath, trimmedName);
    setCreateFolderLoading(false);
    if (!ok) {
      alert("Failed to create folder. It may already exist or use invalid characters.");
      return;
    }
    setCreateDialogOpen(false);
    setFolderName("New Folder");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (createDialogOpen) return;
      if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        beginCreateFolder();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPath, createDialogOpen]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div data-tour="sidebar-root" className="flex h-full flex-col gap-3">
        <div data-tour="sidebar-favorites">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            <span>Favorites</span>
            <Star className="h-3 w-3 text-white/40" />
          </div>
          <SortableContext
            items={sidebarFavorites.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="glass-surface rounded-2xl p-1.5 flex flex-col gap-1">
              {sidebarFavorites.map((item) => (
                <SidebarFavoriteRow key={item.id} item={item} />
              ))}
              {sidebarFavorites.length === 0 && (
                <p className="px-2 py-1 text-[11px] text-white/40">
                  Drag folders here to pin them.
                </p>
              )}
            </div>
          </SortableContext>
        </div>

        <div data-tour="sidebar-locations">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            <span>Locations</span>
            <HardDrive className="h-3 w-3 text-white/40" />
          </div>
          <div className="glass-surface rounded-2xl p-1.5 flex flex-col gap-1">
            {favorites.map((item) => {
              const isActive = !activeBin && currentPath === item.path;
              const Icon = FAVORITE_ICONS[item.name] ?? Folder;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleLocationClick(item.path)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs [-webkit-app-region:no-drag] ${isActive
                      ? "rounded-2xl bg-blue-500/80 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_8px_18px_rgba(59,130,246,0.25)]"
                      : "rounded-2xl text-white/80 hover:bg-white/8"
                    }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bin */}
        <div>
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            <span>Bin</span>
            <Trash2 className="h-3 w-3 text-white/40" />
          </div>
          <div className="glass-surface rounded-2xl p-1.5 flex flex-col gap-1">
            <button
              data-tour="sidebar-bin"
              type="button"
              onClick={onBinClick}
              className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs [-webkit-app-region:no-drag] ${activeBin
                  ? "rounded-2xl bg-red-500/60 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.3),0_8px_18px_rgba(239,68,68,0.2)]"
                  : "rounded-2xl text-white/80 hover:bg-white/8"
                }`}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Trash</span>
              {binCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500/30 px-1.5 py-0.5 text-[10px] tabular-nums text-red-300">
                  {binCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-auto pt-1">
          <button
            type="button"
            onClick={beginCreateFolder}
            className="glass-surface flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left text-xs text-white/80 transition duration-200 hover:bg-white/8 [-webkit-app-region:no-drag]"
          >
            <FolderPlus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">New Folder</span>
          </button>
        </div>

        <ConfirmDialog
          open={createDialogOpen}
          title="Creating a new folder"
          message="Name the folder, then press Enter or click OK."
          isLoading={createFolderLoading}
          confirmLabel="OK"
          onConfirm={() => {
            void submitCreateFolder();
          }}
          onCancel={cancelCreateFolder}
        >
          <input
            ref={folderInputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitCreateFolder();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelCreateFolder();
              }
            }}
            placeholder="Folder name"
            className="w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
          />
        </ConfirmDialog>
      </div>
    </DndContext>
  );
}
