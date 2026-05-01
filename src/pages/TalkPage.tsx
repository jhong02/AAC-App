import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/talkpage.css";
import {
  speakWithSettings,
  speakTileWordInstant,
  syncRuntimeTTSSettingsFromDB,
  primeTTSVoices,
  unlockTTSForUserGesture,
} from "../hooks/useTTSSettings";
import { useDatabase } from "../hooks/useDatabase";
import { getCategories } from "../db/wordRepository";
import {
  useBoardConfig,
  GRID_LAYOUTS,
  INITIAL_BOARD_TILES,
  type GridPreset,
  type WordTile,
} from "../context/BoardConfigContext";
import { useSessionLogger } from "../hooks/useSessionLogger";
import { usePrediction } from "../hooks/usePrediction";
import { hasPin, checkPin, isPinSetupComplete } from "../hooks/usePIN";
import PinOverlay from "../components/PinOverlay";
import FirstLoadModal from "../components/FirstLoadModal";

import arrowLeftIcon from "../assets/images/icons/arrow_left.png";
import arrowRightIcon from "../assets/images/icons/arrow_right.png";
import homeIcon from "../assets/images/icons/home.png";

import uiBackPageSound from "../assets/sounds/ui_back_page.wav";
import uiNextPageSound from "../assets/sounds/ui_next_page.wav";
import uiCategoryBarSound from "../assets/sounds/ui_category_bar_open.wav";
import uiUndoButtonSound from "../assets/sounds/ui_undo_button.wav";
import uiClearButtonSound from "../assets/sounds/ui_clear_button.wav";

type TalkAction = "undo" | "clear" | "fill" | "speak";
type VisualMode = "default" | "mono" | "colorblind";

type TalkControl = {
  id: string;
  label: string;
  icon: string;
  action: TalkAction;
  accent: string;
  labelColor: string;
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

type CategoryOption = {
  value: string;
  label: string;
};

type SoundKey =
  | "home"
  | "backPage"
  | "nextPage"
  | "categoryBar"
  | "undo"
  | "clear";

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

const VISUAL_MODE_STORAGE_KEY = "aac-talk-visual-mode";
const CUSTOM_BOARDS_STORAGE_KEY = "aac-custom-boards";
const CUSTOM_BOARDS_EVENT = "aac-custom-boards-updated";
const DEFAULT_BOARD_STORAGE_KEY = "aac-default-board-v2";

const VISUAL_MODE_OPTIONS: { id: VisualMode; label: string }[] = [
  { id: "default", label: "Color" },
  { id: "mono", label: "Mono" },
  { id: "colorblind", label: "Color Blind" },
];

const TALK_CONTROLS: TalkControl[] = [
  {
    id: "undo",
    label: "Undo",
    icon: "↩",
    action: "undo",
    accent: "#F4B73F",
    labelColor: "#F5A623",
  },
  {
    id: "clear",
    label: "Clear",
    icon: "✕",
    action: "clear",
    accent: "#FF7640",
    labelColor: "#FF6A33",
  },
  {
    id: "fill",
    label: "Fill",
    icon: "▦",
    action: "fill",
    accent: "#58AFFF",
    labelColor: "#3D96F2",
  },
  {
    id: "speak",
    label: "Speak!",
    icon: "🔊",
    action: "speak",
    accent: "#7BD531",
    labelColor: "#6FCF26",
  },
];

function cloneTiles(tiles: WordTile[]): WordTile[] {
  return tiles.map((tile) => ({ ...tile }));
}

function readSavedBoards(): SavedBoard[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_BOARDS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function readDefaultBoardSnapshot(): DefaultBoardSnapshot | null {
  try {
    const raw = window.localStorage.getItem(DEFAULT_BOARD_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DefaultBoardSnapshot;

    if (!Array.isArray(parsed.tiles)) return null;
    if (!parsed.gridPreset) return null;

    return parsed;
  } catch {
    return null;
  }
}

function getSavedVisualMode(): VisualMode {
  if (typeof window === "undefined") return "default";

  const saved = window.localStorage.getItem(VISUAL_MODE_STORAGE_KEY);

  if (saved === "mono" || saved === "colorblind") {
    return saved;
  }

  return "default";
}

function makeNavTile(
  action: "previous" | "next",
  disabled: boolean,
  pageIndex: number
): NavTile {
  return {
    id: `${action}-nav-${pageIndex}`,
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

function isBlankTile(tile: WordTile): boolean {
  return (
    tile.category === "blank" ||
    (!tile.label.trim() && !tile.value.trim() && !tile.icon.trim())
  );
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase();
}

function getSpeakableText(text: string): string {
  return text
    .replace(/\bI\b/g, "eye")
    .replace(/\bi\b/g, "eye")
    .trim();
}

function triggerHaptic(duration = 10): void {
  if (typeof navigator === "undefined") return;

  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
  }
}

function buildVisibleGrid(
  contentTiles: WordTile[],
  cols: number,
  rows: number,
  currentPage: number,
  totalPages: number
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
      makeEmptyTile(`empty-top-${currentPage}-${filledTopTiles.length}`)
    );
  }

  while (filledBottomTiles.length < bottomMiddleCount) {
    filledBottomTiles.push(
      makeEmptyTile(`empty-bottom-${currentPage}-${filledBottomTiles.length}`)
    );
  }

  return [
    ...filledTopTiles,
    makeNavTile("previous", currentPage === 0, currentPage),
    ...filledBottomTiles,
    makeNavTile("next", currentPage === totalPages - 1, currentPage),
  ];
}

function formatCategoryLabel(category: string): string {
  return category
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCategoryTheme(
  category?: string,
  visualMode: VisualMode = "default"
): CSSProperties {
  if (visualMode === "mono") {
    switch (category) {
      case "basic":
        return {
          "--tile-category-bg": "#f4f4f4",
          "--tile-category-border": "#4a4a4a",
        } as CSSProperties;

      case "pronoun":
        return {
          "--tile-category-bg": "#e8e8e8",
          "--tile-category-border": "#3f3f3f",
        } as CSSProperties;

      case "verb":
        return {
          "--tile-category-bg": "#dddddd",
          "--tile-category-border": "#333333",
        } as CSSProperties;

      case "descriptor":
        return {
          "--tile-category-bg": "#d4d4d4",
          "--tile-category-border": "#2e2e2e",
        } as CSSProperties;

      case "custom":
        return {
          "--tile-category-bg": "#eeeeee",
          "--tile-category-border": "#555555",
        } as CSSProperties;

      default:
        return {
          "--tile-category-bg": "#f7f7f7",
          "--tile-category-border": "#555555",
        } as CSSProperties;
    }
  }

  if (visualMode === "colorblind") {
    switch (category) {
      case "basic":
        return {
          "--tile-category-bg": "#FFE8A3",
          "--tile-category-border": "#A86F00",
        } as CSSProperties;

      case "pronoun":
        return {
          "--tile-category-bg": "#C7E5FF",
          "--tile-category-border": "#006FB8",
        } as CSSProperties;

      case "verb":
        return {
          "--tile-category-bg": "#CFEFEA",
          "--tile-category-border": "#00796B",
        } as CSSProperties;

      case "descriptor":
        return {
          "--tile-category-bg": "#E5D4FF",
          "--tile-category-border": "#6A4FA3",
        } as CSSProperties;

      case "custom":
        return {
          "--tile-category-bg": "#FFD5B8",
          "--tile-category-border": "#B85C00",
        } as CSSProperties;

      default:
        return {
          "--tile-category-bg": "#F7F7F7",
          "--tile-category-border": "#5F6368",
        } as CSSProperties;
    }
  }

  switch (category) {
    case "basic":
      return {
        "--tile-category-bg": "#FFF0B8",
        "--tile-category-border": "#DDB44A",
      } as CSSProperties;

    case "pronoun":
      return {
        "--tile-category-bg": "#D8EBFF",
        "--tile-category-border": "#69A9E8",
      } as CSSProperties;

    case "verb":
      return {
        "--tile-category-bg": "#DDF6CF",
        "--tile-category-border": "#7FC65A",
      } as CSSProperties;

    case "descriptor":
      return {
        "--tile-category-bg": "#FFDDE3",
        "--tile-category-border": "#E28A9B",
      } as CSSProperties;

    case "custom":
      return {
        "--tile-category-bg": "#FFF2C7",
        "--tile-category-border": "#E1BE54",
      } as CSSProperties;

    default:
      return {};
  }
}

function getControlTheme(
  control: TalkControl,
  visualMode: VisualMode
): CSSProperties {
  if (visualMode === "mono") {
    return {
      "--accent": "#707070",
      "--label-color": "#333333",
    } as CSSProperties;
  }

  if (visualMode === "colorblind") {
    switch (control.action) {
      case "undo":
        return {
          "--accent": "#E69F00",
          "--label-color": "#B36B00",
        } as CSSProperties;

      case "clear":
        return {
          "--accent": "#D55E00",
          "--label-color": "#B34700",
        } as CSSProperties;

      case "fill":
        return {
          "--accent": "#0072B2",
          "--label-color": "#005F99",
        } as CSSProperties;

      case "speak":
        return {
          "--accent": "#009E73",
          "--label-color": "#007A58",
        } as CSSProperties;

      default:
        return {
          "--accent": control.accent,
          "--label-color": control.labelColor,
        } as CSSProperties;
    }
  }

  return {
    "--accent": control.accent,
    "--label-color": control.labelColor,
  } as CSSProperties;
}

function createUiAudio(src: string) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = 0.55;
  audio.load();
  return audio;
}

const TalkPage = () => {
  const navigate = useNavigate();

  const { boardTiles, setBoardTiles, gridPreset, setGridPreset } =
    useBoardConfig();
  const { logTap } = useSessionLogger();
  const { db } = useDatabase();
  const layout = GRID_LAYOUTS[gridPreset];

  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(0);
  const [visualMode, setVisualMode] = useState<VisualMode>(getSavedVisualMode);
  const [searchQuery, setSearchQuery] = useState("");

  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [isCustomBoardsOpen, setIsCustomBoardsOpen] = useState(false);
  const [activeBoardKind, setActiveBoardKind] = useState<"default" | "custom">(
    "default"
  );

  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const customBoardsRef = useRef<HTMLDivElement | null>(null);
  const soundBankRef = useRef<Record<SoundKey, HTMLAudioElement> | null>(null);
  const lastPointerActionRef = useRef<{ id: string; time: number } | null>(null);
  const voicesPrimedRef = useRef(false);

  const [showPinOverlay, setShowPinOverlay] = useState(false);
  const [showFirstLoad, setShowFirstLoad] = useState(false);

  const displayedSentence = sentenceWords.join(" ");

  const { prediction, acceptPrediction, clearPrediction } = usePrediction(
    db ?? null,
    sentenceWords,
    (word) => {
      setSentenceWords((prev) => {
        logTap(word, prev.length);
        return [...prev, word];
      });
    }
  );

  const primeSpeechFast = () => {
    if (voicesPrimedRef.current) return;

    voicesPrimedRef.current = true;
    primeTTSVoices();

    if (db) {
      syncRuntimeTTSSettingsFromDB(db);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VISUAL_MODE_STORAGE_KEY, visualMode);
  }, [visualMode]);

  useEffect(() => {
    const syncBoards = () => setSavedBoards(readSavedBoards());

    syncBoards();

    window.addEventListener("storage", syncBoards);
    window.addEventListener(CUSTOM_BOARDS_EVENT, syncBoards);

    return () => {
      window.removeEventListener("storage", syncBoards);
      window.removeEventListener(CUSTOM_BOARDS_EVENT, syncBoards);
    };
  }, []);

  useEffect(() => {
    soundBankRef.current = {
      home: createUiAudio(uiBackPageSound),
      backPage: createUiAudio(uiBackPageSound),
      nextPage: createUiAudio(uiNextPageSound),
      categoryBar: createUiAudio(uiCategoryBarSound),
      undo: createUiAudio(uiUndoButtonSound),
      clear: createUiAudio(uiClearButtonSound),
    };

    return () => {
      const bank = soundBankRef.current;
      if (!bank) return;

      Object.values(bank).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  useEffect(() => {
    if (!db) return;
    if (!isPinSetupComplete(db)) setShowFirstLoad(true);
  }, [db]);

  useEffect(() => {
    primeTTSVoices();

    const secondPrimeTimer = window.setTimeout(() => {
      primeTTSVoices();
    }, 350);

    if (db) {
      syncRuntimeTTSSettingsFromDB(db);
    }

    return () => window.clearTimeout(secondPrimeTimer);
  }, [db]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(target)
      ) {
        setIsCategoryMenuOpen(false);
      }

      if (
        customBoardsRef.current &&
        !customBoardsRef.current.contains(target)
      ) {
        setIsCustomBoardsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const playSound = (key: SoundKey) => {
    const audio = soundBankRef.current?.[key];
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  const rememberPointerAction = (id: string) => {
    lastPointerActionRef.current = {
      id,
      time: window.performance.now(),
    };
  };

  const shouldSkipSyntheticClick = (id: string) => {
    const lastPointerAction = lastPointerActionRef.current;
    const now = window.performance.now();

    return Boolean(
      lastPointerAction &&
        lastPointerAction.id === id &&
        now - lastPointerAction.time < 600
    );
  };

  const runPointerAction = (
    event: ReactPointerEvent<HTMLButtonElement>,
    id: string,
    action: () => void
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    rememberPointerAction(id);
    action();
  };

  const runClickAction = (
    event: ReactMouseEvent<HTMLButtonElement>,
    id: string,
    action: () => void
  ) => {
    void event;

    if (shouldSkipSyntheticClick(id)) return;

    action();
  };

  useEffect(() => {
    const boardCategories = Array.from(
      new Set(
        boardTiles
          .map((tile) => tile.category)
          .filter((category): category is string => Boolean(category))
      )
    ).filter((category) => category !== "sample" && category !== "blank");

    if (!db) {
      setCategoryOptions(boardCategories.sort((a, b) => a.localeCompare(b)));
      return;
    }

    const dbCategories = getCategories(db).filter(
      (category) => category !== "sample" && category !== "blank"
    );

    const mergedCategories = Array.from(
      new Set([...dbCategories, ...boardCategories])
    ).sort((a, b) => a.localeCompare(b));

    setCategoryOptions(mergedCategories);
  }, [db, boardTiles]);

  useEffect(() => {
    if (
      selectedCategory !== "all" &&
      !categoryOptions.includes(selectedCategory)
    ) {
      setSelectedCategory("all");
    }
  }, [categoryOptions, selectedCategory]);

  const menuOptions = useMemo<CategoryOption[]>(
    () => [
      { value: "all", label: "All Categories" },
      ...categoryOptions.map((category) => ({
        value: category,
        label: formatCategoryLabel(category),
      })),
    ],
    [categoryOptions]
  );

  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const selectedIndex = menuOptions.findIndex(
      (option) => option.value === selectedCategory
    );

    setHighlightedCategoryIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isCategoryMenuOpen, menuOptions, selectedCategory]);

  const filteredBoardTiles = useMemo(() => {
    const categoryFilteredTiles =
      selectedCategory === "all"
        ? boardTiles
        : boardTiles.filter((tile) => tile.category === selectedCategory);

    const cleanedSearch = normalizeSearchText(searchQuery);

    if (!cleanedSearch) {
      return categoryFilteredTiles;
    }

    return categoryFilteredTiles.filter((tile) => {
      if (isBlankTile(tile)) return false;

      const searchableText = normalizeSearchText(
        `${tile.label} ${tile.value} ${tile.category ?? ""}`
      );

      return searchableText.includes(cleanedSearch);
    });
  }, [boardTiles, selectedCategory, searchQuery]);

  const contentSlotsPerPage = layout.cols * layout.rows - 2;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBoardTiles.length / contentSlotsPerPage)
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, searchQuery, gridPreset]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const currentContentTiles = useMemo(() => {
    const start = currentPage * contentSlotsPerPage;
    const end = start + contentSlotsPerPage;
    return filteredBoardTiles.slice(start, end);
  }, [filteredBoardTiles, currentPage, contentSlotsPerPage]);

  const visibleTiles = useMemo(
    () =>
      buildVisibleGrid(
        currentContentTiles,
        layout.cols,
        layout.rows,
        currentPage,
        totalPages
      ),
    [currentContentTiles, layout.cols, layout.rows, currentPage, totalPages]
  );

  const speakText = (text: string) => {
    const speakableText = getSpeakableText(text);

    if (!speakableText.trim()) return;

    primeSpeechFast();
    speakWithSettings(speakableText, undefined, db ?? undefined);
  };

  const speakTileFast = (text: string) => {
    const speakableText = getSpeakableText(text);

    if (!speakableText.trim()) return;

    primeSpeechFast();
    speakTileWordInstant(speakableText, undefined, db ?? undefined);
  };

  const markPressed = (id: string) => {
    setLastPressedId(id);
    window.setTimeout(() => {
      setLastPressedId((current) => (current === id ? null : current));
    }, 180);
  };

  const handleLoadCustomBoard = (board: SavedBoard) => {
    triggerHaptic(8);
    playSound("categoryBar");

    setActiveBoardKind("custom");
    setBoardTiles(cloneTiles(board.tiles));
    setGridPreset(board.gridPreset);
    setSelectedCategory("all");
    setSearchQuery("");
    setCurrentPage(0);
    setIsCustomBoardsOpen(false);
  };

  const handleLoadDefaultBoard = () => {
    triggerHaptic(8);
    playSound("categoryBar");

    const savedDefaultBoard = readDefaultBoardSnapshot();

    if (savedDefaultBoard) {
      setBoardTiles(cloneTiles(savedDefaultBoard.tiles));
      setGridPreset(savedDefaultBoard.gridPreset);
    } else {
      setBoardTiles(cloneTiles(INITIAL_BOARD_TILES));
      setGridPreset("default");
    }

    setActiveBoardKind("default");
    setSelectedCategory("all");
    setSearchQuery("");
    setCurrentPage(0);
    setIsCustomBoardsOpen(false);
  };

  const handleWordTap = (
    tile: WordTile,
    options: { tactile?: boolean } = {}
  ) => {
    if (isBlankTile(tile)) return;

    const tactile = options.tactile ?? true;

    if (tactile) {
      triggerHaptic(8);
      markPressed(tile.id);
    }

    // speakTileFast(tile.value); // disabled — tiles no longer speak on tap

    setSentenceWords((prev) => {
      logTap(tile.value, prev.length);
      return [...prev, tile.value];
    });
  };

  const handleWordPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    tile: WordTile
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isBlankTile(tile)) return;

    triggerHaptic(8);
    markPressed(tile.id);
    primeSpeechFast();
    unlockTTSForUserGesture();
  };

  const handleWordClick = (tile: WordTile) => {
    handleWordTap(tile, { tactile: false });
  };

  const handleNavTap = (tile: NavTile) => {
    if (tile.disabled) return;

    triggerHaptic(10);
    playSound(tile.action === "previous" ? "backPage" : "nextPage");
    markPressed(tile.id);

    setCurrentPage((prev) => {
      if (tile.action === "previous") return Math.max(prev - 1, 0);
      return Math.min(prev + 1, totalPages - 1);
    });
  };

  const handleControlAction = (action: TalkAction, controlId: string) => {
    triggerHaptic(10);
    markPressed(controlId);

    switch (action) {
      case "undo":
        playSound("undo");
        setSentenceWords((prev) => prev.slice(0, -1));
        clearPrediction();
        break;

      case "clear":
        playSound("clear");
        setSentenceWords([]);
        clearPrediction();
        break;

      case "fill":
        acceptPrediction();
        break;

      case "speak":
        speakText(displayedSentence);
        break;

      default:
        break;
    }
  };

  const handleSentenceBarPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    triggerHaptic(8);
    primeSpeechFast();
    unlockTTSForUserGesture();
  };

  const handleSentenceBarClick = () => {
    speakText(displayedSentence);
  };

  const handleBoardsTap = () => {
    triggerHaptic(8);
    playSound("categoryBar");
    setIsCustomBoardsOpen((prev) => !prev);
  };

  const handleHomeTap = () => {
    triggerHaptic(10);
    playSound("home");

    if (!db || !hasPin(db)) {
      navigate("/home");
    } else {
      setShowPinOverlay(true);
    }
  };

  const openCategoryMenu = () => {
    triggerHaptic(8);
    playSound("categoryBar");
    setIsCategoryMenuOpen(true);
  };

  const closeCategoryMenu = () => {
    setIsCategoryMenuOpen(false);
  };

  const toggleCategoryMenu = () => {
    if (isCategoryMenuOpen) {
      closeCategoryMenu();
      return;
    }

    openCategoryMenu();
  };

  const handleCategorySelect = (category: string) => {
    triggerHaptic(8);
    playSound("categoryBar");
    setSelectedCategory(category);
    closeCategoryMenu();
    categoryTriggerRef.current?.focus();
  };

  const handleVisualModeChange = (mode: VisualMode) => {
    if (visualMode === mode) return;

    triggerHaptic(8);
    playSound("categoryBar");
    setVisualMode(mode);
  };

  const handleClearSearch = () => {
    if (!searchQuery.trim()) return;

    triggerHaptic(8);
    playSound("categoryBar");
    setSearchQuery("");
  };

  const handleCategoryKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (!menuOptions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!isCategoryMenuOpen) {
        openCategoryMenu();
        return;
      }

      setHighlightedCategoryIndex((prev) => (prev + 1) % menuOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!isCategoryMenuOpen) {
        openCategoryMenu();
        return;
      }

      setHighlightedCategoryIndex(
        (prev) => (prev - 1 + menuOptions.length) % menuOptions.length
      );
      return;
    }

    if (event.key === "Home") {
      if (!isCategoryMenuOpen) return;
      event.preventDefault();
      setHighlightedCategoryIndex(0);
      return;
    }

    if (event.key === "End") {
      if (!isCategoryMenuOpen) return;
      event.preventDefault();
      setHighlightedCategoryIndex(menuOptions.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!isCategoryMenuOpen) {
        openCategoryMenu();
        return;
      }

      const option = menuOptions[highlightedCategoryIndex];
      if (option) {
        handleCategorySelect(option.value);
      }

      return;
    }

    if (event.key === "Escape") {
      if (!isCategoryMenuOpen) return;
      event.preventDefault();
      closeCategoryMenu();
    }
  };

  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "All Categories"
      : formatCategoryLabel(selectedCategory);

  return (
    <section className={`talk-page visual-${visualMode}`}>
      <div className="talk-board-shell">
        <div className="talk-top-bar">
          <div className="talk-top-left">
            <div className="talk-custom-boards" ref={customBoardsRef}>
              <button
                type="button"
                className="talk-top-badge talk-top-badge--custom-boards"
                aria-label="Boards"
                aria-expanded={isCustomBoardsOpen}
                onPointerDown={(event) =>
                  runPointerAction(event, "boards-menu", handleBoardsTap)
                }
                onClick={(event) =>
                  runClickAction(event, "boards-menu", handleBoardsTap)
                }
              >
                <span className="talk-top-badge__icon" aria-hidden="true">
                  ★
                </span>
                <span className="talk-top-badge__text">Boards</span>
                <span
                  className={`talk-custom-boards__chevron ${
                    isCustomBoardsOpen ? "is-open" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>

              <div
                className={`talk-custom-boards__menu ${
                  isCustomBoardsOpen ? "is-open" : ""
                }`}
              >
                <div className="talk-custom-boards__title">Boards</div>

                {savedBoards.length === 0 ? (
                  <div className="talk-custom-boards__empty">
                    No custom boards saved yet.
                  </div>
                ) : (
                  savedBoards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      className="talk-custom-boards__item"
                      onPointerDown={(event) =>
                        runPointerAction(event, `custom-board-${board.id}`, () =>
                          handleLoadCustomBoard(board)
                        )
                      }
                      onClick={(event) =>
                        runClickAction(event, `custom-board-${board.id}`, () =>
                          handleLoadCustomBoard(board)
                        )
                      }
                    >
                      <span>{board.name}</span>
                      <span className="talk-custom-boards__item-meta">
                        {GRID_LAYOUTS[board.gridPreset]?.label ?? "Board"}
                      </span>
                    </button>
                  ))
                )}

                <div className="talk-custom-boards__divider" />

                <button
                  type="button"
                  className={`talk-custom-boards__item talk-custom-boards__item--default ${
                    activeBoardKind === "default" ? "is-active" : ""
                  }`}
                  onPointerDown={(event) =>
                    runPointerAction(event, "default-board", handleLoadDefaultBoard)
                  }
                  onClick={(event) =>
                    runClickAction(event, "default-board", handleLoadDefaultBoard)
                  }
                >
                  <span>Default Board</span>
                  <span className="talk-custom-boards__item-meta">
                    Includes your latest default board changes
                  </span>
                </button>
              </div>
            </div>

            <div className="visual-mode-toggle" aria-label="Visual mode">
              {VISUAL_MODE_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`visual-mode-toggle__btn ${
                    visualMode === mode.id ? "is-active" : ""
                  }`}
                  aria-pressed={visualMode === mode.id}
                  onPointerDown={(event) =>
                    runPointerAction(event, `visual-mode-${mode.id}`, () =>
                      handleVisualModeChange(mode.id)
                    )
                  }
                  onClick={(event) =>
                    runClickAction(event, `visual-mode-${mode.id}`, () =>
                      handleVisualModeChange(mode.id)
                    )
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="talk-top-badge talk-top-badge--home"
            aria-label="Go to home page"
            onPointerDown={(event) =>
              runPointerAction(event, "home-button", handleHomeTap)
            }
            onClick={(event) =>
              runClickAction(event, "home-button", handleHomeTap)
            }
          >
            <img src={homeIcon} alt="" className="talk-top-badge__icon-img" />
            <span className="talk-top-badge__text">Home</span>
          </button>
        </div>

        <button
          type="button"
          className={`talk-sentence-bar ${displayedSentence ? "" : "is-empty"}`}
          onPointerDown={handleSentenceBarPointerDown}
          onClick={handleSentenceBarClick}
          aria-label="Sentence bar"
        >
          {displayedSentence || "\u00A0"}
          {prediction && displayedSentence && (
            <span className="talk-prediction-preview" aria-hidden="true">
              {prediction}
            </span>
          )}
        </button>

        <div className="talk-filter-row">
          <div className="talk-filter" ref={categoryMenuRef}>
            <div className="talk-filter__dropdown">
              <button
                ref={categoryTriggerRef}
                type="button"
                className={`talk-filter__trigger talk-filter__trigger--${selectedCategory} ${
                  isCategoryMenuOpen ? "is-open" : ""
                }`}
                onPointerDown={(event) =>
                  runPointerAction(event, "category-trigger", toggleCategoryMenu)
                }
                onClick={(event) =>
                  runClickAction(event, "category-trigger", toggleCategoryMenu)
                }
                onKeyDown={handleCategoryKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isCategoryMenuOpen}
              >
                <span>{selectedCategoryLabel}</span>
                <span className="talk-filter__chevron" aria-hidden="true">
                  ▾
                </span>
              </button>

              <div
                className={`talk-filter__menu ${
                  isCategoryMenuOpen ? "is-open" : ""
                }`}
                role="listbox"
                aria-label="Filter words by category"
              >
                {menuOptions.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`talk-filter__menu-button talk-filter__menu-button--${option.value} ${
                      selectedCategory === option.value ? "is-selected" : ""
                    } ${
                      highlightedCategoryIndex === index ? "is-highlighted" : ""
                    }`}
                    onPointerDown={(event) =>
                      runPointerAction(event, `category-${option.value}`, () =>
                        handleCategorySelect(option.value)
                      )
                    }
                    onClick={(event) =>
                      runClickAction(event, `category-${option.value}`, () =>
                        handleCategorySelect(option.value)
                      )
                    }
                    onMouseEnter={() => setHighlightedCategoryIndex(index)}
                  >
                    <span className="talk-filter__menu-text">
                      {option.label}
                    </span>
                    <span
                      className={`talk-filter__menu-check ${
                        selectedCategory === option.value ? "is-visible" : ""
                      }`}
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="talk-filter-right">
            <label className="talk-search">
              <span className="talk-search__box">
                <span className="talk-search__icon" aria-hidden="true">
                  ⌕
                </span>

                <input
                  className="talk-search__input"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search words..."
                  aria-label="Search words"
                />

                {searchQuery.trim() ? (
                  <button
                    type="button"
                    className="talk-search__clear"
                    onPointerDown={(event) =>
                      runPointerAction(event, "clear-search", handleClearSearch)
                    }
                    onClick={(event) =>
                      runClickAction(event, "clear-search", handleClearSearch)
                    }
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </span>
            </label>
          </div>
        </div>

        <div
          className={`talk-grid is-${gridPreset}`}
          style={{ "--talk-cols": layout.cols } as CSSProperties}
          aria-label="AAC talk board"
        >
          {visibleTiles.map((tile) => {
            if (tile.type === "empty") {
              return (
                <div
                  key={tile.id}
                  className="talk-tile is-empty"
                  aria-hidden="true"
                />
              );
            }

            if (tile.type === "nav") {
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`talk-tile is-nav ${
                    lastPressedId === tile.id ? "is-pressed" : ""
                  } ${tile.disabled ? "is-disabled" : ""}`}
                  onPointerDown={(event) =>
                    runPointerAction(event, `nav-${tile.id}`, () => handleNavTap(tile))
                  }
                  onClick={(event) =>
                    runClickAction(event, `nav-${tile.id}`, () => handleNavTap(tile))
                  }
                  aria-label={tile.label}
                  aria-disabled={tile.disabled}
                >
                  <span className="talk-tile__icon">
                    <img
                      src={tile.icon}
                      alt=""
                      className="talk-tile__icon-img"
                      draggable="false"
                    />
                  </span>
                  <span className="talk-tile__label">{tile.label}</span>
                </button>
              );
            }

            if (isBlankTile(tile)) {
              return (
                <div
                  key={tile.id}
                  className="talk-tile is-empty-word"
                  aria-hidden="true"
                />
              );
            }

            return (
              <button
                key={tile.id}
                type="button"
                className={`talk-tile is-word is-category-${
                  tile.category ?? "default"
                } ${lastPressedId === tile.id ? "is-pressed" : ""}`}
                style={getCategoryTheme(tile.category, visualMode)}
                onPointerDown={(event) => handleWordPointerDown(event, tile)}
                onClick={() => handleWordClick(tile)}
                aria-label={tile.label}
              >
                <span className="talk-tile__icon">
                  <img
                    src={tile.icon}
                    alt=""
                    className="talk-tile__icon-img"
                    draggable="false"
                  />
                </span>
                <span className="talk-tile__label">{tile.label}</span>
              </button>
            );
          })}
        </div>

        <div className="talk-controls">
          {TALK_CONTROLS.map((control) => {
            const style = getControlTheme(control, visualMode);

            return (
              <button
                key={control.id}
                type="button"
                className={`talk-control-btn ${
                  control.action === "speak" ? "is-speak" : ""
                } ${lastPressedId === control.id ? "is-pressed" : ""}`}
                style={style}
                onPointerDown={(event) => {
                  if (control.action === "speak") {
                    if (event.pointerType === "mouse" && event.button !== 0) return;

                    triggerHaptic(10);
                    markPressed(control.id);
                    primeSpeechFast();
                    unlockTTSForUserGesture();
                    return;
                  }

                  runPointerAction(event, `control-${control.id}`, () =>
                    handleControlAction(control.action, control.id)
                  );
                }}
                onClick={(event) => {
                  if (control.action === "speak") {
                    handleControlAction(control.action, control.id);
                    return;
                  }

                  runClickAction(event, `control-${control.id}`, () =>
                    handleControlAction(control.action, control.id)
                  );
                }}
                aria-label={control.label}
              >
                <span className="talk-control-btn__icon">{control.icon}</span>
                <span className="talk-control-btn__label">{control.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="talk-page-indicator"
          aria-label={`Page ${currentPage + 1} of ${totalPages}`}
        >
          <span className="talk-page-indicator__text">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="talk-page-indicator__dots" aria-hidden="true">
            {Array.from({ length: totalPages }, (_, index) => (
              <span
                key={`page-dot-${index}`}
                className={`talk-page-indicator__dot ${
                  index === currentPage ? "is-active" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {showPinOverlay && db && (
        <PinOverlay
          title="Admin Access"
          onCheck={(input) => checkPin(db, input)}
          onSuccess={() => {
            setShowPinOverlay(false);
            navigate("/home");
          }}
          onCancel={() => setShowPinOverlay(false)}
        />
      )}

      {showFirstLoad && db && (
        <FirstLoadModal db={db} onDone={() => setShowFirstLoad(false)} />
      )}
    </section>
  );
};

export default TalkPage;