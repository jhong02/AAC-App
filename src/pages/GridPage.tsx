import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import "./GridPage.css";
import {
  useBoardConfig,
  GRID_LAYOUTS,
  INITIAL_BOARD_TILES,
  type GridPreset,
  type WordTile,
} from "../context/BoardConfigContext";

import arrowLeftIcon from "../assets/images/icons/arrow_left.png";
import arrowRightIcon from "../assets/images/icons/arrow_right.png";
import homeIcon from "../assets/images/icons/home.png";
import pizzaIcon from "../assets/images/icons/pizza.png";

import deleteSound from "../assets/sounds/delete.wav";
import gridsettingsMoveTileSound from "../assets/sounds/gridsettings_move_tile.wav";
import gridsettingAddCustomWordSound from "../assets/sounds/gridsetting_add_custom_word.wav";
import gridsettingSaveSound from "../assets/sounds/gridsetting_save.wav";
import uiCancelSound from "../assets/sounds/ui_cancel.wav";
import uiClickSound from "../assets/sounds/ui_click.wav";

type TileCategory = "basic" | "pronoun" | "verb" | "descriptor" | "custom";

type CustomDraft = {
  label: string;
  imageSrc: string;
  fileName: string;
  category: TileCategory;
};

type NavTile = {
  id: string;
  label: string;
  icon: string;
  type: "nav";
  action: "previous" | "next";
  disabled: boolean;
};

type EmptyTile = {
  id: string;
  type: "empty";
};

type RenderTile = WordTile | NavTile | EmptyTile;

type AppDialog = {
  title: string;
  message: string;
  tone?: "info" | "warning" | "danger" | "success";
  confirmLabel?: string;
  cancelLabel?: string | null;
  onConfirm?: (() => void) | null;
  onClose?: (() => void) | null;
};

type SavedBoard = {
  id: string;
  name: string;
  tiles: WordTile[];
  gridPreset: GridPreset;
  createdAt: number;
  updatedAt: number;
};

type DefaultBoardSnapshot = {
  tiles: WordTile[];
  gridPreset: GridPreset;
  updatedAt: number;
};

type BoardSnapshot = {
  tiles: WordTile[];
  gridPreset: GridPreset;
  page: number;
};

const CUSTOM_TILE_CATEGORIES: { value: TileCategory; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "pronoun", label: "Pronoun" },
  { value: "verb", label: "Verb" },
  { value: "descriptor", label: "Descriptor" },
  { value: "custom", label: "Custom" },
];

const CUSTOM_BOARDS_STORAGE_KEY = "aac-custom-boards";
const CUSTOM_BOARDS_EVENT = "aac-custom-boards-updated";
const DEFAULT_BOARD_STORAGE_KEY = "aac-default-board-v2";

const SOUND_SOURCES = {
  click: uiClickSound,
  moveTile: gridsettingsMoveTileSound,
  delete: deleteSound,
  save: gridsettingSaveSound,
  cancel: uiCancelSound,
  addCustomWord: gridsettingAddCustomWordSound,
} as const;

type SoundName = keyof typeof SOUND_SOURCES;

function cloneTiles(tiles: WordTile[]): WordTile[] {
  return tiles.map((tile) => ({ ...tile }));
}

function readSavedBoards(): SavedBoard[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BOARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeSavedBoards(boards: SavedBoard[]) {
  localStorage.setItem(CUSTOM_BOARDS_STORAGE_KEY, JSON.stringify(boards));
  window.dispatchEvent(new Event(CUSTOM_BOARDS_EVENT));
}

function readDefaultBoardSnapshot(): DefaultBoardSnapshot | null {
  try {
    const raw = localStorage.getItem(DEFAULT_BOARD_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DefaultBoardSnapshot;

    if (!Array.isArray(parsed.tiles)) return null;
    if (!parsed.gridPreset) return null;

    return parsed;
  } catch {
    return null;
  }
}

function writeDefaultBoardSnapshot(tiles: WordTile[], preset: GridPreset) {
  try {
    const snapshot: DefaultBoardSnapshot = {
      tiles: cloneTiles(tiles),
      gridPreset: preset,
      updatedAt: Date.now(),
    };

    localStorage.setItem(DEFAULT_BOARD_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage may fail in restricted browsers
  }
}

function defaultCustomDraft(): CustomDraft {
  return {
    label: "",
    imageSrc: pizzaIcon,
    fileName: "",
    category: "custom",
  };
}

function buildCustomTile(draft: CustomDraft): WordTile {
  const cleanedLabel = draft.label.trim() || "[custom]";

  return {
    id: `custom-${Date.now()}`,
    label: cleanedLabel,
    value: cleanedLabel.toLowerCase(),
    icon: draft.imageSrc || pizzaIcon,
    type: "word",
    category: draft.category,
  };
}

function buildBlankTile(id: string): WordTile {
  return {
    id,
    label: "",
    value: "",
    icon: "",
    type: "word",
    category: "blank",
  };
}

function buildBlankTiles(prefix: string, count: number): WordTile[] {
  return Array.from({ length: count }, (_, index) =>
    buildBlankTile(`${prefix}-blank-${Date.now()}-${index}`)
  );
}

function isBlankTile(tile: WordTile): boolean {
  return (
    tile.category === "blank" ||
    (!tile.label.trim() && !tile.value.trim() && !tile.icon.trim())
  );
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase();
}

function makeNavTile(
  action: "previous" | "next",
  disabled: boolean,
  pageIndex: number,
  prefix = "nav"
): NavTile {
  return {
    id: `${prefix}-${action}-${pageIndex}`,
    label: action === "previous" ? "Previous" : "Next",
    icon: action === "previous" ? arrowLeftIcon : arrowRightIcon,
    type: "nav",
    action,
    disabled,
  };
}

function makeEmptyTile(id: string): EmptyTile {
  return { id, type: "empty" };
}

function buildVisibleGrid(
  contentTiles: WordTile[],
  cols: number,
  rows: number,
  currentPage: number,
  totalPages: number,
  prefix = "preview"
): RenderTile[] {
  const topSectionCount = cols * (rows - 1);
  const bottomMiddleCount = cols - 2;

  const topTiles = contentTiles.slice(0, topSectionCount);
  const bottomTiles = contentTiles.slice(
    topSectionCount,
    topSectionCount + bottomMiddleCount
  );

  const filledTopTiles: RenderTile[] = [...topTiles];
  const filledBottomTiles: RenderTile[] = [...bottomTiles];

  while (filledTopTiles.length < topSectionCount) {
    filledTopTiles.push(
      makeEmptyTile(`${prefix}-empty-top-${currentPage}-${filledTopTiles.length}`)
    );
  }

  while (filledBottomTiles.length < bottomMiddleCount) {
    filledBottomTiles.push(
      makeEmptyTile(
        `${prefix}-empty-bottom-${currentPage}-${filledBottomTiles.length}`
      )
    );
  }

  return [
    ...filledTopTiles,
    makeNavTile("previous", currentPage === 0, currentPage, prefix),
    ...filledBottomTiles,
    makeNavTile("next", currentPage === totalPages - 1, currentPage, prefix),
  ];
}

function getCategoryPreviewStyle(category: TileCategory): CSSProperties {
  switch (category) {
    case "basic":
      return {
        "--custom-preview-bg": "#FFF0B8",
        "--custom-preview-border": "#DDB44A",
      } as CSSProperties;
    case "pronoun":
      return {
        "--custom-preview-bg": "#D8EBFF",
        "--custom-preview-border": "#69A9E8",
      } as CSSProperties;
    case "verb":
      return {
        "--custom-preview-bg": "#DDF6CF",
        "--custom-preview-border": "#7FC65A",
      } as CSSProperties;
    case "descriptor":
      return {
        "--custom-preview-bg": "#FFDDE3",
        "--custom-preview-border": "#E28A9B",
      } as CSSProperties;
    case "custom":
    default:
      return {
        "--custom-preview-bg": "#FFF2C7",
        "--custom-preview-border": "#E1BE54",
      } as CSSProperties;
  }
}

function getCategoryOptionStyle(category: TileCategory): CSSProperties {
  switch (category) {
    case "basic":
      return { backgroundColor: "#FFF0B8", color: "#4a4332" };
    case "pronoun":
      return { backgroundColor: "#D8EBFF", color: "#31485c" };
    case "verb":
      return { backgroundColor: "#DDF6CF", color: "#35513a" };
    case "descriptor":
      return { backgroundColor: "#FFDDE3", color: "#5a3940" };
    case "custom":
    default:
      return { backgroundColor: "#FFF2C7", color: "#5a4a20" };
  }
}

function getTileCategoryClass(category?: string): string {
  switch (category) {
    case "basic":
      return "is-category-basic";
    case "pronoun":
      return "is-category-pronoun";
    case "verb":
      return "is-category-verb";
    case "descriptor":
      return "is-category-descriptor";
    case "custom":
      return "is-category-custom";
    default:
      return "";
  }
}

export default function GridPage() {
  const navigate = useNavigate();
  const {
    boardTiles,
    setBoardTiles,
    gridPreset,
    setGridPreset,
  } = useBoardConfig();

  const boardsMenuRef = useRef<HTMLDivElement | null>(null);
  const soundRefs = useRef<Partial<Record<SoundName, HTMLAudioElement>>>({});

  const [currentPage, setCurrentPage] = useState(0);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(defaultCustomDraft());
  const [pendingCustomTile, setPendingCustomTile] = useState<WordTile | null>(null);
  const [pendingCoreTile, setPendingCoreTile] = useState<WordTile | null>(null);
  const [coreWordSearch, setCoreWordSearch] = useState("");
  const [customPulseTileId, setCustomPulseTileId] = useState<string | null>(null);

  const [isCustomBoardMode, setIsCustomBoardMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveSourceTileId, setMoveSourceTileId] = useState<string | null>(null);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deletePulseTileId, setDeletePulseTileId] = useState<string | null>(null);

  const [modeStartTiles, setModeStartTiles] = useState<WordTile[] | null>(null);
  const [modeHistory, setModeHistory] = useState<WordTile[][]>([]);

  const [dialog, setDialog] = useState<AppDialog | null>(null);

  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [isBoardsMenuOpen, setIsBoardsMenuOpen] = useState(false);
  const [isSaveBoardModalOpen, setIsSaveBoardModalOpen] = useState(false);
  const [customBoardName, setCustomBoardName] = useState("");
  const [activeCustomBoardId, setActiveCustomBoardId] = useState<string | null>(null);
  const [preCustomBoardSnapshot, setPreCustomBoardSnapshot] =
    useState<BoardSnapshot | null>(null);

  const [isCorePickerOpen, setIsCorePickerOpen] = useState(false);
  const [corePickerPage, setCorePickerPage] = useState(0);

  const layout = GRID_LAYOUTS[gridPreset];
  const contentSlotsPerPage = layout.cols * layout.rows - 2;
  const totalPages = Math.max(1, Math.ceil(boardTiles.length / contentSlotsPerPage));

  useEffect(() => {
    soundRefs.current = Object.entries(SOUND_SOURCES).reduce(
      (acc, [name, src]) => {
        const audio = new Audio(src);
        audio.preload = "auto";
        acc[name as SoundName] = audio;
        return acc;
      },
      {} as Partial<Record<SoundName, HTMLAudioElement>>
    );
  }, []);

  const playSound = (soundName: SoundName) => {
    const audio = soundRefs.current[soundName];
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore browser autoplay restrictions or missing sound files.
    });
  };

  const handlePageButtonClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button");

    if (!button) return;
    if (!event.currentTarget.contains(button)) return;
    if (button.disabled || button.getAttribute("aria-disabled") === "true") return;

    playSound("click");
  };

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    const syncBoards = () => {
      setSavedBoards(readSavedBoards());
    };

    syncBoards();
    window.addEventListener("storage", syncBoards);
    window.addEventListener(CUSTOM_BOARDS_EVENT, syncBoards);

    return () => {
      window.removeEventListener("storage", syncBoards);
      window.removeEventListener(CUSTOM_BOARDS_EVENT, syncBoards);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!boardsMenuRef.current) return;
      if (!boardsMenuRef.current.contains(event.target as Node)) {
        setIsBoardsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentContentTiles = useMemo(() => {
    const start = currentPage * contentSlotsPerPage;
    const end = start + contentSlotsPerPage;
    return boardTiles.slice(start, end);
  }, [boardTiles, currentPage, contentSlotsPerPage]);

  const visibleTiles = useMemo(
    () =>
      buildVisibleGrid(
        currentContentTiles,
        layout.cols,
        layout.rows,
        currentPage,
        totalPages,
        "board"
      ),
    [currentContentTiles, layout.cols, layout.rows, currentPage, totalPages]
  );

  const coreWordOptions = useMemo(() => {
    const seen = new Set<string>();

    return INITIAL_BOARD_TILES.filter((tile) => {
      if (isBlankTile(tile)) return false;
      if (tile.label === "[sample]") return false;

      const key = `${tile.label}-${tile.value}-${tile.category ?? "basic"}`;
      if (seen.has(key)) return false;
      seen.add(key);

      return true;
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filteredCoreWordOptions = useMemo(() => {
    const cleanedSearch = normalizeSearchText(coreWordSearch);
    if (!cleanedSearch) return coreWordOptions;

    return coreWordOptions.filter((tile) => {
      const searchableText = normalizeSearchText(
        `${tile.label} ${tile.value} ${tile.category ?? ""}`
      );
      return searchableText.includes(cleanedSearch);
    });
  }, [coreWordOptions, coreWordSearch]);

  const corePickerTotalPages = Math.max(
    1,
    Math.ceil(filteredCoreWordOptions.length / contentSlotsPerPage)
  );

  useEffect(() => {
    setCorePickerPage((prev) => Math.min(prev, corePickerTotalPages - 1));
  }, [corePickerTotalPages]);

  const corePickerContentTiles = useMemo(() => {
    const start = corePickerPage * contentSlotsPerPage;
    const end = start + contentSlotsPerPage;
    return filteredCoreWordOptions.slice(start, end);
  }, [filteredCoreWordOptions, corePickerPage, contentSlotsPerPage]);

  const corePickerVisibleTiles = useMemo(
    () =>
      buildVisibleGrid(
        corePickerContentTiles,
        layout.cols,
        layout.rows,
        corePickerPage,
        corePickerTotalPages,
        "core-picker"
      ),
    [corePickerContentTiles, layout.cols, layout.rows, corePickerPage, corePickerTotalPages]
  );

  const hasModeChanges = modeHistory.length > 0;
  const hasActiveEditMode = isMoveMode || isDeleteMode;

  const showInfoDialog = (
    title: string,
    message: string,
    confirmLabel = "OK",
    tone: AppDialog["tone"] = "info"
  ) => {
    setDialog({
      title,
      message,
      tone,
      confirmLabel,
      cancelLabel: null,
    });
  };

  const showConfirmDialog = ({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "warning",
    onConfirm,
    onClose,
  }: AppDialog) => {
    setDialog({
      title,
      message,
      tone,
      confirmLabel,
      cancelLabel,
      onConfirm,
      onClose,
    });
  };

  const closeDialog = () => {
    playSound("cancel");
    const onClose = dialog?.onClose;
    setDialog(null);
    onClose?.();
  };

  const confirmDialog = () => {
    const onConfirm = dialog?.onConfirm;
    const onClose = dialog?.onClose;
    setDialog(null);
    onConfirm?.();
    onClose?.();
  };

  const clearPendingCoreWord = () => {
    setPendingCoreTile(null);
  };

  const startModeSession = () => {
    setModeStartTiles(cloneTiles(boardTiles));
    setModeHistory([]);
    setMoveSourceTileId(null);
    setDeletePulseTileId(null);
    setCustomPulseTileId(null);
    setPendingCustomTile(null);
    clearPendingCoreWord();
  };

  const clearModeSession = () => {
    setIsMoveMode(false);
    setIsDeleteMode(false);
    setMoveSourceTileId(null);
    setDeletePulseTileId(null);
    setModeStartTiles(null);
    setModeHistory([]);
  };

  const canSwitchIntoAnotherEditMode = () => {
    if (pendingCustomTile || pendingCoreTile) {
      showInfoDialog(
        "Place or cancel selected tile",
        "Please place or cancel the selected tile before starting another mode."
      );
      return false;
    }

    if (!hasActiveEditMode) return true;

    if (hasModeChanges || moveSourceTileId || deletePulseTileId) {
      showInfoDialog(
        "Finish current edit mode",
        "Please confirm or cancel the current edit mode first."
      );
      return false;
    }

    return true;
  };

  const applyBoardChange = (nextTiles: WordTile[]) => {
    setModeHistory((prev) => [...prev, cloneTiles(boardTiles)]);
    setBoardTiles(nextTiles);
  };

  const handlePresetChange = (preset: GridPreset) => {
    if (hasActiveEditMode) {
      showInfoDialog(
        "Finish current edit mode",
        "Please confirm or cancel the current edit mode first."
      );
      return;
    }

    setGridPreset(preset);
    setCurrentPage(0);
  };

  const openCustomModal = () => {
    if (hasActiveEditMode || pendingCoreTile) {
      showInfoDialog(
        "Finish current action",
        "Please finish or cancel the current action first."
      );
      return;
    }

    setCustomDraft(defaultCustomDraft());
    setPendingCustomTile(null);
    setCustomPulseTileId(null);
    setIsCustomModalOpen(true);
  };

  const closeCustomModal = () => {
    playSound("cancel");
    setIsCustomModalOpen(false);
  };

  const handleCustomImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : pizzaIcon;

      setCustomDraft((prev) => ({
        ...prev,
        imageSrc: result,
        fileName: file.name,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleCustomDone = () => {
    playSound("addCustomWord");
    setPendingCustomTile(buildCustomTile(customDraft));
    clearPendingCoreWord();
    setCustomPulseTileId(null);
    setIsCustomModalOpen(false);
  };

  const placeTileIntoTarget = (sourceTile: WordTile, targetTile: WordTile) => {
    const nextTiles = cloneTiles(boardTiles).map((tile) =>
      tile.id === targetTile.id
        ? {
            ...sourceTile,
            id: targetTile.id,
          }
        : tile
    );

    setBoardTiles(nextTiles);
    setPendingCustomTile(null);
    clearPendingCoreWord();
    setCustomPulseTileId(null);
  };

  const getPlacementMessage = (sourceTile: WordTile, targetTile: WordTile) => {
    if (isBlankTile(targetTile)) {
      return `Place "${sourceTile.label}" as a ${
        sourceTile.category ?? "basic"
      } tile into this blank spot?`;
    }

    return `Replace "${targetTile.label}" with "${sourceTile.label}" and assign it to the ${
      sourceTile.category ?? "basic"
    } category?`;
  };

  const confirmTilePlacement = (sourceTile: WordTile, targetTile: WordTile) => {
    setCustomPulseTileId(targetTile.id);

    showConfirmDialog({
      title: "Place tile?",
      message: getPlacementMessage(sourceTile, targetTile),
      confirmLabel: "Place Tile",
      cancelLabel: "Cancel",
      tone: "warning",
      onConfirm: () => placeTileIntoTarget(sourceTile, targetTile),
      onClose: () => setCustomPulseTileId(null),
    });
  };

  const addCustomToWordGrid = () => {
    if (!pendingCustomTile) return;

    const tileToAdd = {
      ...pendingCustomTile,
      id: `custom-${Date.now()}`,
    };

    showConfirmDialog({
      title: "Add custom tile?",
      message: `Add "${tileToAdd.label}" to the word grid without replacing another tile?`,
      confirmLabel: "Add Tile",
      cancelLabel: "Cancel",
      tone: "warning",
      onConfirm: () => {
        const nextTiles = [...cloneTiles(boardTiles), tileToAdd];
        const addedTileIndex = nextTiles.length - 1;
        const addedTilePage = Math.floor(addedTileIndex / contentSlotsPerPage);

        setBoardTiles(nextTiles);
        setPendingCustomTile(null);
        setCustomPulseTileId(null);
        setCurrentPage(addedTilePage);
      },
    });
  };

  const handleMakeCustomBoard = () => {
    if (hasActiveEditMode || pendingCustomTile || pendingCoreTile) {
      showInfoDialog(
        "Finish current action",
        "Please finish or cancel the current action before making a custom board."
      );
      return;
    }

    showConfirmDialog({
      title: "Make a custom board?",
      message:
        "This will start a blank custom board. You can add blank pages, choose words from the core word picker, and save it as your own board.",
      confirmLabel: "Make Custom Board",
      cancelLabel: "Cancel",
      tone: "warning",
      onConfirm: () => {
        if (!isCustomBoardMode) {
          writeDefaultBoardSnapshot(boardTiles, gridPreset);
        }

        setPreCustomBoardSnapshot({
          tiles: cloneTiles(boardTiles),
          gridPreset,
          page: currentPage,
        });

        const firstBlankPage = buildBlankTiles(
          "custom-board-page-1",
          contentSlotsPerPage
        );

        setIsCustomBoardMode(true);
        setActiveCustomBoardId(null);
        clearModeSession();
        setPendingCustomTile(null);
        clearPendingCoreWord();
        setCustomPulseTileId(null);
        setCoreWordSearch("");
        setBoardTiles(firstBlankPage);
        setCurrentPage(0);
      },
    });
  };

  const handleViewDefaultBoard = () => {
    if (hasActiveEditMode || pendingCustomTile || pendingCoreTile) {
      showInfoDialog(
        "Finish current action",
        "Please finish or cancel the current action before viewing the default board."
      );
      return;
    }

    const savedDefaultBoard = readDefaultBoardSnapshot();

    setIsCustomBoardMode(false);
    setActiveCustomBoardId(null);
    clearModeSession();
    setPendingCustomTile(null);
    clearPendingCoreWord();
    setCustomPulseTileId(null);
    setCoreWordSearch("");
    setIsCorePickerOpen(false);

    if (savedDefaultBoard) {
      setBoardTiles(cloneTiles(savedDefaultBoard.tiles));
      setGridPreset(savedDefaultBoard.gridPreset);
    } else {
      setBoardTiles(cloneTiles(INITIAL_BOARD_TILES));
      setGridPreset("default");
      writeDefaultBoardSnapshot(INITIAL_BOARD_TILES, "default");
    }

    setCurrentPage(0);
  };

  const handleCancelCustomBoard = () => {
    if (!isCustomBoardMode) return;

    showConfirmDialog({
      title: "Cancel custom board?",
      message:
        "This will leave custom board mode and restore the board you were on before.",
      confirmLabel: "Yes, Cancel",
      cancelLabel: "Keep Editing",
      tone: "danger",
      onConfirm: () => {
        playSound("cancel");

        if (preCustomBoardSnapshot) {
          setBoardTiles(cloneTiles(preCustomBoardSnapshot.tiles));
          setGridPreset(preCustomBoardSnapshot.gridPreset);
          setCurrentPage(preCustomBoardSnapshot.page);
        } else {
          setBoardTiles(cloneTiles(INITIAL_BOARD_TILES));
          setGridPreset("default");
          setCurrentPage(0);
        }

        setIsCustomBoardMode(false);
        setActiveCustomBoardId(null);
        setPendingCustomTile(null);
        clearPendingCoreWord();
        clearModeSession();
        setCoreWordSearch("");
        setIsCorePickerOpen(false);
      },
    });
  };

  const handleRestoreDefaultTalkpage = () => {
    if (hasActiveEditMode || pendingCustomTile || pendingCoreTile) {
      showInfoDialog(
        "Finish current action",
        "Please finish or cancel the current action before restoring the default talkpage."
      );
      return;
    }

    showConfirmDialog({
      title: "Restore default talkpage?",
      message:
        "This will restore the default board back to the original core word set.",
      confirmLabel: "Restore",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm: () => {
        setIsCustomBoardMode(false);
        setActiveCustomBoardId(null);
        clearModeSession();
        setPendingCustomTile(null);
        clearPendingCoreWord();
        setCustomPulseTileId(null);
        setCoreWordSearch("");
        setIsCorePickerOpen(false);
        setBoardTiles(cloneTiles(INITIAL_BOARD_TILES));
        setGridPreset("default");
        setCurrentPage(0);
        writeDefaultBoardSnapshot(INITIAL_BOARD_TILES, "default");
      },
    });
  };


  const addBlankPageToCustomBoard = () => {
    const boardSnapshot = cloneTiles(boardTiles);
    const remainder = boardSnapshot.length % contentSlotsPerPage;
    const paddingCount = remainder === 0 ? 0 : contentSlotsPerPage - remainder;
    const paddingTiles = buildBlankTiles("custom-board-padding", paddingCount);
    const newBlankPage = buildBlankTiles(
      `custom-board-page-${totalPages + 1}`,
      contentSlotsPerPage
    );

    const nextTiles = [...boardSnapshot, ...paddingTiles, ...newBlankPage];
    const newPageIndex = Math.floor(
      (nextTiles.length - contentSlotsPerPage) / contentSlotsPerPage
    );

    setBoardTiles(nextTiles);
    setCurrentPage(newPageIndex);
  };

  const selectCoreWord = (tile: WordTile) => {
    setPendingCustomTile(null);
    setCustomPulseTileId(null);
    setPendingCoreTile({
      ...tile,
      id: `core-copy-${tile.id}-${Date.now()}`,
    });
    setIsCorePickerOpen(false);
  };

  const startMoveMode = () => {
    if (!canSwitchIntoAnotherEditMode()) return;
    setIsDeleteMode(false);
    setIsMoveMode(true);
    startModeSession();
  };

  const startDeleteMode = () => {
    if (!canSwitchIntoAnotherEditMode()) return;
    setIsMoveMode(false);
    setIsDeleteMode(true);
    startModeSession();
  };

  const handleUndoModeChange = () => {
    if (!modeHistory.length) return;

    playSound("cancel");
    const previousSnapshot = modeHistory[modeHistory.length - 1];
    setBoardTiles(cloneTiles(previousSnapshot));
    setModeHistory((prev) => prev.slice(0, -1));
    setMoveSourceTileId(null);
    setDeletePulseTileId(null);
    setCustomPulseTileId(null);
  };

  const handleConfirmModeChanges = () => {
    clearModeSession();
  };

  const handleCancelModeChanges = () => {
    playSound("cancel");

    if (modeStartTiles) {
      setBoardTiles(cloneTiles(modeStartTiles));
    }
    clearModeSession();
  };

  const handleCancelAll = () => {
    playSound("cancel");

    if (pendingCustomTile) {
      setPendingCustomTile(null);
      setCustomPulseTileId(null);
      return;
    }

    if (pendingCoreTile) {
      clearPendingCoreWord();
      setCustomPulseTileId(null);
      return;
    }

    handleCancelModeChanges();
  };

  const deleteTileConfirmed = (targetTileId: string) => {
    playSound("delete");

    const nextTiles = cloneTiles(boardTiles).map((tile) =>
      tile.id === targetTileId ? buildBlankTile(tile.id) : tile
    );
    applyBoardChange(nextTiles);
  };

  const moveOrSwapTiles = (sourceTileId: string, targetTileId: string) => {
    if (sourceTileId === targetTileId) return;

    const nextTiles = cloneTiles(boardTiles);
    const sourceIndex = nextTiles.findIndex((tile) => tile.id === sourceTileId);
    const targetIndex = nextTiles.findIndex((tile) => tile.id === targetTileId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const sourceTile = nextTiles[sourceIndex];
    const targetTile = nextTiles[targetIndex];

    if (isBlankTile(targetTile)) {
      nextTiles[sourceIndex] = buildBlankTile(sourceTile.id);
      nextTiles[targetIndex] = {
        ...sourceTile,
        id: targetTile.id,
      };
    } else {
      nextTiles[sourceIndex] = {
        ...targetTile,
        id: sourceTile.id,
      };
      nextTiles[targetIndex] = {
        ...sourceTile,
        id: targetTile.id,
      };
    }

    playSound("moveTile");
    applyBoardChange(nextTiles);
  };

  const handleWordTileClick = (tile: WordTile) => {
    if (pendingCustomTile) {
      confirmTilePlacement(pendingCustomTile, tile);
      return;
    }

    if (pendingCoreTile) {
      confirmTilePlacement(pendingCoreTile, tile);
      return;
    }

    if (isDeleteMode) {
      if (isBlankTile(tile)) return;

      playSound("moveTile");
      setDeletePulseTileId(tile.id);

      showConfirmDialog({
        title: "Delete tile?",
        message: `Are you sure you want to delete "${tile.label}"?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        tone: "danger",
        onConfirm: () => deleteTileConfirmed(tile.id),
        onClose: () => setDeletePulseTileId(null),
      });

      return;
    }

    if (isMoveMode) {
      if (!moveSourceTileId) {
        if (isBlankTile(tile)) return;
        setMoveSourceTileId(tile.id);
        return;
      }

      if (moveSourceTileId === tile.id) {
        setMoveSourceTileId(null);
        return;
      }

      moveOrSwapTiles(moveSourceTileId, tile.id);
      setMoveSourceTileId(null);
    }
  };

  const handleNavTap = (tile: NavTile) => {
    if (tile.disabled) return;

    setCurrentPage((prev) => {
      if (tile.action === "previous") return Math.max(prev - 1, 0);
      return Math.min(prev + 1, totalPages - 1);
    });
  };

  const handleCorePickerNav = (tile: NavTile) => {
    if (tile.disabled) return;

    setCorePickerPage((prev) => {
      if (tile.action === "previous") return Math.max(prev - 1, 0);
      return Math.min(prev + 1, corePickerTotalPages - 1);
    });
  };

  const closeCorePicker = () => {
    playSound("cancel");
    setIsCorePickerOpen(false);
  };

  const closeSaveBoardModal = () => {
    playSound("cancel");
    setIsSaveBoardModalOpen(false);
  };

  const handleOpenSaveBoardModal = () => {
    if (!isCustomBoardMode) {
      writeDefaultBoardSnapshot(boardTiles, gridPreset);
      playSound("save");

      showInfoDialog(
        "Default board saved",
        "Your current default board layout has been saved.",
        "Got it",
        "success"
      );

      return;
    }

    setCustomBoardName(
      activeCustomBoardId
        ? savedBoards.find((board) => board.id === activeCustomBoardId)?.name ?? ""
        : `Custom Board ${savedBoards.length + 1}`
    );

    setIsSaveBoardModalOpen(true);
  };


  const handleSaveCustomBoard = () => {
    const cleanName = customBoardName.trim();
    if (!cleanName) return;

    const nextBoards = [...readSavedBoards()];
    const now = Date.now();

    if (activeCustomBoardId) {
      const existingIndex = nextBoards.findIndex((board) => board.id === activeCustomBoardId);
      if (existingIndex !== -1) {
        nextBoards[existingIndex] = {
          ...nextBoards[existingIndex],
          name: cleanName,
          tiles: cloneTiles(boardTiles),
          gridPreset,
          updatedAt: now,
        };
      }
    } else {
      const newBoard: SavedBoard = {
        id: `saved-board-${now}`,
        name: cleanName,
        tiles: cloneTiles(boardTiles),
        gridPreset,
        createdAt: now,
        updatedAt: now,
      };
      nextBoards.unshift(newBoard);
      setActiveCustomBoardId(newBoard.id);
    }

    writeSavedBoards(nextBoards);
    playSound("save");
    setSavedBoards(nextBoards);
    setIsSaveBoardModalOpen(false);

    showInfoDialog(
      "Custom board saved",
      `"${cleanName}" has been saved to your Custom Boards list.`,
      "Nice",
      "success"
    );
  };

  const handleLoadSavedBoard = (board: SavedBoard) => {
    if (!isCustomBoardMode && !preCustomBoardSnapshot) {
      setPreCustomBoardSnapshot({
        tiles: cloneTiles(boardTiles),
        gridPreset,
        page: currentPage,
      });
    }

    setBoardTiles(cloneTiles(board.tiles));
    setGridPreset(board.gridPreset);
    setCurrentPage(0);
    setIsCustomBoardMode(true);
    setActiveCustomBoardId(board.id);
    setIsBoardsMenuOpen(false);
    setPendingCustomTile(null);
    clearPendingCoreWord();
    clearModeSession();
    setCoreWordSearch("");
  };

  const handleDeleteSavedBoard = (board: SavedBoard) => {
    playSound("moveTile");

    showConfirmDialog({
      title: "Delete custom board?",
      message: `Do you want to delete "${board.name}"?`,
      confirmLabel: "Delete Board",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm: () => {
        playSound("delete");

        const nextBoards = readSavedBoards().filter((item) => item.id !== board.id);
        writeSavedBoards(nextBoards);
        setSavedBoards(nextBoards);

        if (activeCustomBoardId === board.id) {
          setActiveCustomBoardId(null);
        }
      },
    });
  };

  const isInteractiveMode = Boolean(
    pendingCustomTile || pendingCoreTile || isMoveMode || isDeleteMode
  );

  const previewModeClass =
    pendingCustomTile || pendingCoreTile
      ? "is-custom-mode"
      : isMoveMode
      ? "is-move-mode"
      : isDeleteMode
      ? "is-delete-mode"
      : isCustomBoardMode
      ? "is-custom-board-mode"
      : "";

  return (
    <section className="grid-settings-page" onClickCapture={handlePageButtonClickCapture}>
      <div className="grid-settings-shell">
        <div className="grid-settings-quick-actions">
          <div className="grid-custom-boards-dropdown" ref={boardsMenuRef}>
            <button
              type="button"
              className="grid-settings-top-action is-boards"
              onClick={() => setIsBoardsMenuOpen((prev) => !prev)}
            >
              View Custom Boards
            </button>

            {isBoardsMenuOpen && (
              <div className="grid-custom-boards-dropdown__menu">
                <div className="grid-custom-boards-dropdown__title">
                  Saved Custom Boards
                </div>

                {savedBoards.length === 0 ? (
                  <div className="grid-custom-boards-dropdown__empty">
                    No custom boards saved yet.
                  </div>
                ) : (
                  savedBoards.map((board) => (
                    <div key={board.id} className="grid-custom-boards-dropdown__item">
                      <button
                        type="button"
                        className="grid-custom-boards-dropdown__load"
                        onClick={() => handleLoadSavedBoard(board)}
                      >
                        {board.name}
                      </button>

                      <button
                        type="button"
                        className="grid-custom-boards-dropdown__delete"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteSavedBoard(board);
                        }}
                        aria-label={`Delete ${board.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="grid-settings-top-action is-default-board"
            onClick={handleViewDefaultBoard}
          >
            View Default Board
          </button>

          <button
            type="button"
            className={`grid-settings-top-action is-custom-board ${
              isCustomBoardMode ? "is-active" : ""
            }`}
            onClick={handleMakeCustomBoard}
          >
            Make Custom Board
          </button>

          <button
            type="button"
            className="grid-settings-top-action is-back"
            onClick={() => navigate("/user-config")}
          >
            ← Back to Config
          </button>

          <button
            type="button"
            className="grid-settings-home-badge"
            aria-label="Go to home page"
            onClick={() => navigate("/home")}
          >
            <img
              src={homeIcon}
              alt=""
              className="grid-settings-home-badge__icon-img"
            />
            <span className="grid-settings-home-badge__text">Home</span>
          </button>
        </div>

        <div className="grid-settings-header">
          <div>
            <h1 className="grid-settings-title">🔠 Grid Settings</h1>
            <p className="grid-settings-subtitle">
              Change the board layout and manage custom tiles here.
            </p>
          </div>
        </div>

        <div className="grid-settings-top">
          <section className="grid-settings-card">
            <h2 className="grid-settings-card__title">Grid Size</h2>

            <div className="grid-settings-presets">
              {(Object.keys(GRID_LAYOUTS) as GridPreset[]).map((preset) => {
                const presetLayout = GRID_LAYOUTS[preset];

                return (
                  <button
                    key={preset}
                    type="button"
                    className={`grid-settings-preset ${
                      gridPreset === preset ? "is-active" : ""
                    }`}
                    onClick={() => handlePresetChange(preset)}
                  >
                    <span className="grid-settings-preset__name">
                      {presetLayout.label}
                    </span>
                    <span className="grid-settings-preset__meta">
                      {presetLayout.cols} × {presetLayout.rows}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid-settings-card">
            <h2 className="grid-settings-card__title">Board Actions</h2>

            <div className="grid-settings-actions">
              <button
                type="button"
                className="grid-settings-action-btn is-custom"
                onClick={openCustomModal}
              >
                Custom Tile
              </button>

              <button
                type="button"
                className={`grid-settings-action-btn is-move ${
                  isMoveMode ? "is-active" : ""
                }`}
                onClick={startMoveMode}
              >
                Move Tile
              </button>

              <button
                type="button"
                className={`grid-settings-action-btn is-delete ${
                  isDeleteMode ? "is-active" : ""
                }`}
                onClick={startDeleteMode}
              >
                Delete Tile
              </button>

              <button
                type="button"
                className="grid-settings-action-btn is-restore"
                onClick={handleRestoreDefaultTalkpage}
              >
                Restore Default Talkpage
              </button>

              <button
                type="button"
                className="grid-settings-action-btn is-save"
                onClick={handleOpenSaveBoardModal}
              >
                Save
              </button>
            </div>

            <p className="grid-settings-note">
              You can add custom tiles, move tiles around, delete tiles into blank spaces,
              restore the default board, or save your current board changes.
            </p>
          </section>
        </div>

        {isCustomBoardMode && (
          <section className="grid-custom-board-panel">
            <div className="grid-custom-board-panel__header">
              <div>
                <h2 className="grid-custom-board-panel__title">
                  Custom Board Mode
                </h2>
                <p className="grid-custom-board-panel__subtitle">
                  Search or choose a core word, then tap any tile below to place it.
                </p>
              </div>

              <div className="grid-custom-board-panel__top-actions">
                <button
                  type="button"
                  className="grid-custom-board-panel__page-btn"
                  onClick={addBlankPageToCustomBoard}
                >
                  + Add Blank Page
                </button>

                <button
                  type="button"
                  className="grid-custom-board-panel__cancel-btn"
                  onClick={handleCancelCustomBoard}
                >
                  Cancel Custom Board
                </button>
              </div>
            </div>

            <div className="grid-core-word-tools">
              <label className="grid-core-word-field">
                <span>Search Core Words</span>
                <input
                  type="text"
                  value={coreWordSearch}
                  onChange={(event) => setCoreWordSearch(event.target.value)}
                  placeholder="Search words..."
                />
              </label>

              <div className="grid-core-word-field">
                <span>Core Words Dropdown</span>
                <button
                  type="button"
                  className="grid-core-word-picker-btn"
                  onClick={() => setIsCorePickerOpen(true)}
                >
                  {pendingCoreTile ? pendingCoreTile.label : "Choose a core word..."}
                </button>
              </div>
            </div>
          </section>
        )}

        {(pendingCustomTile || pendingCoreTile || isMoveMode || isDeleteMode) && (
          <div className={`grid-placement-bar ${previewModeClass}`}>
            <span className="grid-placement-bar__text">
              {pendingCustomTile &&
                `Custom tile ready: ${pendingCustomTile.label}. Category: ${pendingCustomTile.category}. Tap a tile below to replace it, or use Add to Word Grid.`}

              {pendingCoreTile &&
                `Core word selected: ${pendingCoreTile.label}. Tap any tile below to place it.`}

              {!pendingCustomTile &&
                !pendingCoreTile &&
                isMoveMode &&
                !moveSourceTileId &&
                "Move mode is on. Tap the tile you want to move."}

              {!pendingCustomTile &&
                !pendingCoreTile &&
                isMoveMode &&
                moveSourceTileId &&
                "Now tap the destination tile. Existing tiles will swap. Blank tiles will move the word and leave the old tile blank."}

              {!pendingCustomTile &&
                !pendingCoreTile &&
                isDeleteMode &&
                'Delete mode is on. Tap any tile below to delete it. You will get an in-app "Are you sure?" warning first.'}
            </span>

            <div className="grid-placement-bar__actions">
              {pendingCustomTile && (
                <button
                  type="button"
                  className="grid-placement-bar__btn is-add"
                  onClick={addCustomToWordGrid}
                >
                  Add to Word Grid
                </button>
              )}

              {!pendingCustomTile && !pendingCoreTile && hasActiveEditMode && (
                <>
                  <button
                    type="button"
                    className="grid-placement-bar__btn is-undo"
                    onClick={handleUndoModeChange}
                    disabled={!hasModeChanges}
                  >
                    Undo
                  </button>

                  <button
                    type="button"
                    className="grid-placement-bar__btn is-confirm"
                    onClick={handleConfirmModeChanges}
                  >
                    Confirm Changes
                  </button>
                </>
              )}

              <button
                type="button"
                className="grid-placement-bar__btn is-cancel"
                onClick={handleCancelAll}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <section
          className={`grid-settings-card grid-settings-preview-card ${previewModeClass}`}
        >
          <div className="grid-settings-preview-header">
            <h2 className="grid-settings-card__title">Board Preview</h2>
            <span className="grid-settings-preview-meta">
              {layout.label} layout · {layout.cols} columns · {layout.rows} rows
            </span>
          </div>

          <div
            className={`grid-preview-grid is-${gridPreset} ${previewModeClass}`}
            style={{ "--grid-preview-cols": layout.cols } as CSSProperties}
            aria-label="Grid preview"
          >
            {visibleTiles.map((tile) => {
              if (tile.type === "empty") {
                return (
                  <div
                    key={tile.id}
                    className="grid-preview-tile is-empty"
                    aria-hidden="true"
                  />
                );
              }

              if (tile.type === "nav") {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`grid-preview-tile is-nav ${
                      tile.disabled ? "is-disabled" : ""
                    }`}
                    onClick={() => handleNavTap(tile)}
                    aria-label={tile.label}
                    aria-disabled={tile.disabled}
                  >
                    <span className="grid-preview-tile__icon">
                      <img
                        src={tile.icon}
                        alt=""
                        className="grid-preview-tile__icon-img"
                        draggable="false"
                      />
                    </span>
                    <span className="grid-preview-tile__label">
                      {tile.label}
                    </span>
                  </button>
                );
              }

              const blank = isBlankTile(tile);
              const selectedSource = moveSourceTileId === tile.id;
              const pendingDelete = deletePulseTileId === tile.id;
              const pendingCustom = customPulseTileId === tile.id;
              const categoryClass = !blank ? getTileCategoryClass(tile.category) : "";

              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`grid-preview-tile is-word ${
                    blank ? "is-blank-word" : ""
                  } ${isInteractiveMode ? "is-interactive" : ""} ${
                    pendingCustomTile || pendingCoreTile ? "is-replaceable" : ""
                  } ${isMoveMode ? "is-movable" : ""} ${
                    isDeleteMode && !blank ? "is-deletable" : ""
                  } ${selectedSource ? "is-selected-source" : ""} ${
                    pendingDelete ? "is-pending-delete" : ""
                  } ${pendingCustom ? "is-pending-custom" : ""} ${categoryClass}`}
                  onClick={() => handleWordTileClick(tile)}
                  aria-label={blank ? "Blank tile" : tile.label}
                >
                  {!blank && (
                    <>
                      <span className="grid-preview-tile__icon">
                        <img
                          src={tile.icon}
                          alt=""
                          className="grid-preview-tile__icon-img"
                          draggable="false"
                        />
                      </span>
                      <span className="grid-preview-tile__label">
                        {tile.label}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="grid-preview-page-indicator"
            aria-label={`Page ${currentPage + 1} of ${totalPages}`}
          >
            <span className="grid-preview-page-indicator__text">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div className="grid-preview-page-indicator__dots" aria-hidden="true">
              {Array.from({ length: totalPages }, (_, index) => (
                <span
                  key={`preview-page-dot-${index}`}
                  className={`grid-preview-page-indicator__dot ${
                    index === currentPage ? "is-active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {isCustomModalOpen && (
        <div className="grid-custom-modal-backdrop" onClick={closeCustomModal}>
          <div
            className="grid-custom-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create custom tile"
          >
            <h2 className="grid-custom-modal__title">Create Custom Tile</h2>

            <div
              className="grid-custom-preview"
              style={getCategoryPreviewStyle(customDraft.category)}
            >
              <div className="grid-custom-preview__icon">
                <img
                  src={customDraft.imageSrc || pizzaIcon}
                  alt=""
                  className="grid-custom-preview__img"
                />
              </div>

              <div className="grid-custom-preview__label">
                {customDraft.label.trim() || "[custom]"}
              </div>

              <div className="grid-custom-preview__category">
                {CUSTOM_TILE_CATEGORIES.find(
                  (option) => option.value === customDraft.category
                )?.label ?? "Custom"}
              </div>
            </div>

            <label className="grid-custom-modal__field">
              <span>Word</span>
              <input
                type="text"
                value={customDraft.label}
                onChange={(event) =>
                  setCustomDraft((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
                placeholder="Type your custom word"
                maxLength={24}
              />
            </label>

            <label className="grid-custom-modal__field">
              <span>Category</span>
              <select
                className={`grid-custom-category-select is-${customDraft.category}`}
                value={customDraft.category}
                onChange={(event) =>
                  setCustomDraft((prev) => ({
                    ...prev,
                    category: event.target.value as TileCategory,
                  }))
                }
              >
                {CUSTOM_TILE_CATEGORIES.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    style={getCategoryOptionStyle(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid-custom-modal__field">
              <span>Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomImageChange}
              />
              <small>{customDraft.fileName || "No file selected yet"}</small>
            </label>

            <div className="grid-custom-modal__actions">
              <button
                type="button"
                className="grid-custom-modal__btn is-secondary"
                onClick={closeCustomModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="grid-custom-modal__btn"
                onClick={handleCustomDone}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isCorePickerOpen && (
        <div
          className="grid-custom-modal-backdrop grid-core-picker-backdrop"
          onClick={closeCorePicker}
        >
          <div
            className="grid-core-picker-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choose a core word"
          >
            <section className="grid-settings-card grid-settings-preview-card is-custom-board-mode">
              <div className="grid-settings-preview-header">
                <h2 className="grid-settings-card__title">Core Words Dropdown</h2>
                <span className="grid-settings-preview-meta">
                  Pick a word to place onto the board
                </span>
              </div>

              <div
                className={`grid-preview-grid is-${gridPreset} is-custom-board-mode`}
                style={{ "--grid-preview-cols": layout.cols } as CSSProperties}
              >
                {corePickerVisibleTiles.map((tile) => {
                  if (tile.type === "empty") {
                    return (
                      <div
                        key={tile.id}
                        className="grid-preview-tile is-empty"
                        aria-hidden="true"
                      />
                    );
                  }

                  if (tile.type === "nav") {
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        className={`grid-preview-tile is-nav ${
                          tile.disabled ? "is-disabled" : ""
                        }`}
                        onClick={() => handleCorePickerNav(tile)}
                      >
                        <span className="grid-preview-tile__icon">
                          <img
                            src={tile.icon}
                            alt=""
                            className="grid-preview-tile__icon-img"
                            draggable="false"
                          />
                        </span>
                        <span className="grid-preview-tile__label">
                          {tile.label}
                        </span>
                      </button>
                    );
                  }

                  const categoryClass = getTileCategoryClass(tile.category);

                  return (
                    <button
                      key={tile.id}
                      type="button"
                      className={`grid-preview-tile is-word ${categoryClass}`}
                      onClick={() => selectCoreWord(tile)}
                    >
                      <span className="grid-preview-tile__icon">
                        <img
                          src={tile.icon}
                          alt=""
                          className="grid-preview-tile__icon-img"
                          draggable="false"
                        />
                      </span>
                      <span className="grid-preview-tile__label">
                        {tile.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid-preview-page-indicator">
                <span className="grid-preview-page-indicator__text">
                  Page {corePickerPage + 1} of {corePickerTotalPages}
                </span>
                <div className="grid-preview-page-indicator__dots" aria-hidden="true">
                  {Array.from({ length: corePickerTotalPages }, (_, index) => (
                    <span
                      key={`core-dot-${index}`}
                      className={`grid-preview-page-indicator__dot ${
                        index === corePickerPage ? "is-active" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid-core-picker-modal__actions">
                <button
                  type="button"
                  className="grid-custom-modal__btn is-secondary"
                  onClick={closeCorePicker}
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {isSaveBoardModalOpen && (
        <div
          className="grid-custom-modal-backdrop"
          onClick={closeSaveBoardModal}
        >
          <div
            className="grid-save-board-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Save custom board"
          >
            <h2 className="grid-custom-modal__title">Save Custom Board</h2>

            <label className="grid-custom-modal__field">
              <span>Board Name</span>
              <input
                type="text"
                value={customBoardName}
                onChange={(event) => setCustomBoardName(event.target.value)}
                placeholder="Type a board name"
                maxLength={40}
              />
            </label>

            <div className="grid-custom-modal__actions">
              <button
                type="button"
                className="grid-custom-modal__btn is-secondary"
                onClick={closeSaveBoardModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="grid-custom-modal__btn"
                onClick={handleSaveCustomBoard}
              >
                Save Board
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog && (
        <div className="grid-app-dialog-backdrop" onClick={closeDialog}>
          <div
            className={`grid-app-dialog ${dialog.tone ? `is-${dialog.tone}` : ""}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={dialog.title}
          >
            <div className="grid-app-dialog__header">
              <h3 className="grid-app-dialog__title">{dialog.title}</h3>
            </div>

            <p className="grid-app-dialog__message">{dialog.message}</p>

            <div className="grid-app-dialog__actions">
              {dialog.cancelLabel && (
                <button
                  type="button"
                  className="grid-app-dialog__btn is-secondary"
                  onClick={closeDialog}
                >
                  {dialog.cancelLabel}
                </button>
              )}

              <button
                type="button"
                className={`grid-app-dialog__btn ${
                  dialog.tone === "danger" ? "is-danger" : ""
                }`}
                onClick={confirmDialog}
              >
                {dialog.confirmLabel || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}