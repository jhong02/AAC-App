import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
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

const CUSTOM_TILE_CATEGORIES: { value: TileCategory; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "pronoun", label: "Pronoun" },
  { value: "verb", label: "Verb" },
  { value: "descriptor", label: "Descriptor" },
  { value: "custom", label: "Custom" },
];

function cloneTiles(tiles: WordTile[]): WordTile[] {
  return tiles.map((tile) => ({ ...tile }));
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

function isBlankTile(tile: WordTile): boolean {
  return (
    tile.category === "blank" ||
    (!tile.label.trim() && !tile.value.trim() && !tile.icon.trim())
  );
}

function makeNavTile(
  action: "previous" | "next",
  disabled: boolean,
  pageIndex: number
): NavTile {
  return {
    id: `${action}-preview-nav-${pageIndex}`,
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
      makeEmptyTile(`preview-empty-top-${currentPage}-${filledTopTiles.length}`)
    );
  }

  while (filledBottomTiles.length < bottomMiddleCount) {
    filledBottomTiles.push(
      makeEmptyTile(
        `preview-empty-bottom-${currentPage}-${filledBottomTiles.length}`
      )
    );
  }

  return [
    ...filledTopTiles,
    makeNavTile("previous", currentPage === 0, currentPage),
    ...filledBottomTiles,
    makeNavTile("next", currentPage === totalPages - 1, currentPage),
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
      return {
        backgroundColor: "#FFF0B8",
        color: "#4a4332",
      };
    case "pronoun":
      return {
        backgroundColor: "#D8EBFF",
        color: "#31485c",
      };
    case "verb":
      return {
        backgroundColor: "#DDF6CF",
        color: "#35513a",
      };
    case "descriptor":
      return {
        backgroundColor: "#FFDDE3",
        color: "#5a3940",
      };
    case "custom":
    default:
      return {
        backgroundColor: "#FFF2C7",
        color: "#5a4a20",
      };
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
    replaceTile,
  } = useBoardConfig();

  const [currentPage, setCurrentPage] = useState(0);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(defaultCustomDraft());
  const [pendingCustomTile, setPendingCustomTile] = useState<WordTile | null>(null);
  const [customPulseTileId, setCustomPulseTileId] = useState<string | null>(null);

  const [isMoveMode, setIsMoveMode] = useState(false);
  const [moveSourceTileId, setMoveSourceTileId] = useState<string | null>(null);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deletePulseTileId, setDeletePulseTileId] = useState<string | null>(null);

  const [modeStartTiles, setModeStartTiles] = useState<WordTile[] | null>(null);
  const [modeHistory, setModeHistory] = useState<WordTile[][]>([]);

  const [dialog, setDialog] = useState<AppDialog | null>(null);

  const layout = GRID_LAYOUTS[gridPreset];
  const contentSlotsPerPage = layout.cols * layout.rows - 2;
  const totalPages = Math.max(1, Math.ceil(boardTiles.length / contentSlotsPerPage));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

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
        totalPages
      ),
    [currentContentTiles, layout.cols, layout.rows, currentPage, totalPages]
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

  const startModeSession = () => {
    setModeStartTiles(cloneTiles(boardTiles));
    setModeHistory([]);
    setMoveSourceTileId(null);
    setDeletePulseTileId(null);
    setCustomPulseTileId(null);
    setPendingCustomTile(null);
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
    if (hasActiveEditMode) {
      showInfoDialog(
        "Finish current edit mode",
        "Please confirm or cancel the current edit mode first."
      );
      return;
    }

    setCustomDraft(defaultCustomDraft());
    setPendingCustomTile(null);
    setCustomPulseTileId(null);
    setIsCustomModalOpen(true);
  };

  const closeCustomModal = () => {
    setIsCustomModalOpen(false);
  };

  const handleCustomImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result =
        typeof reader.result === "string" ? reader.result : pizzaIcon;

      setCustomDraft((prev) => ({
        ...prev,
        imageSrc: result,
        fileName: file.name,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleCustomDone = () => {
    setPendingCustomTile(buildCustomTile(customDraft));
    setCustomPulseTileId(null);
    setIsCustomModalOpen(false);
  };

  const placePendingCustomTile = (targetTile: WordTile) => {
    if (!pendingCustomTile) return;

    replaceTile(targetTile.id, pendingCustomTile);
    setPendingCustomTile(null);
    setCustomPulseTileId(null);
  };

  const getCustomPlacementMessage = (targetTile: WordTile) => {
    if (!pendingCustomTile) return "";

    if (isBlankTile(targetTile)) {
      return `Place "${pendingCustomTile.label}" as a ${pendingCustomTile.category} tile into this blank spot?`;
    }

    return `Replace "${targetTile.label}" with "${pendingCustomTile.label}" and assign it to the ${pendingCustomTile.category} category?`;
  };

  const confirmCustomPlacement = (targetTile: WordTile) => {
    if (!pendingCustomTile) return;

    setCustomPulseTileId(targetTile.id);

    showConfirmDialog({
      title: "Place custom tile?",
      message: getCustomPlacementMessage(targetTile),
      confirmLabel: "Place Tile",
      cancelLabel: "Cancel",
      tone: "warning",
      onConfirm: () => placePendingCustomTile(targetTile),
      onClose: () => setCustomPulseTileId(null),
    });
  };

  const addCustomToCurrentPage = () => {
    if (!pendingCustomTile) return;

    const targetTile =
      currentContentTiles.find((tile) => isBlankTile(tile)) ??
      currentContentTiles.find((tile) => tile.label === "[sample]");

    if (!targetTile) {
      showInfoDialog(
        "No open spot found",
        "There is no blank or [sample] spot on this page. Tap a tile below to replace it."
      );
      return;
    }

    confirmCustomPlacement(targetTile);
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
    if (modeStartTiles) {
      setBoardTiles(cloneTiles(modeStartTiles));
    }
    clearModeSession();
  };

  const handleCancelAll = () => {
    if (pendingCustomTile) {
      setPendingCustomTile(null);
      setCustomPulseTileId(null);
      return;
    }

    handleCancelModeChanges();
  };

  const deleteTileConfirmed = (targetTileId: string) => {
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

    applyBoardChange(nextTiles);
  };

  const handleRestoreDefaultTalkpage = () => {
    showConfirmDialog({
      title: "Restore default talkpage?",
      message:
        "This will restore the talkpage back to the original core word set list and remove your custom board changes.",
      confirmLabel: "Restore",
      cancelLabel: "Cancel",
      tone: "danger",
      onConfirm: () => {
        setPendingCustomTile(null);
        setCustomPulseTileId(null);
        clearModeSession();
        setBoardTiles(cloneTiles(INITIAL_BOARD_TILES));
        setCurrentPage(0);
      },
    });
  };

  const handleWordTileClick = (tile: WordTile) => {
    if (pendingCustomTile) {
      confirmCustomPlacement(tile);
      return;
    }

    if (isDeleteMode) {
      if (isBlankTile(tile)) return;

      setDeletePulseTileId(tile.id);

      showConfirmDialog({
        title: "Delete tile?",
        message: `Are you sure you want to delete "${tile.label}"?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        tone: "danger",
        onConfirm: () => {
          deleteTileConfirmed(tile.id);
        },
        onClose: () => {
          setDeletePulseTileId(null);
        },
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

  const handleSave = () => {
    showInfoDialog(
      "Board saved",
      "Board settings are saved for this session. Local/device saving can be added next.",
      "Got it",
      "success"
    );
  };

  const isInteractiveMode = Boolean(
    pendingCustomTile || isMoveMode || isDeleteMode
  );

  const previewModeClass = pendingCustomTile
    ? "is-custom-mode"
    : isMoveMode
    ? "is-move-mode"
    : isDeleteMode
    ? "is-delete-mode"
    : "";

  return (
    <section className="grid-settings-page">
      <div className="grid-settings-shell">
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

        <div className="grid-settings-header">
          <div>
            <h1 className="grid-settings-title">🔠 Grid Settings</h1>
            <p className="grid-settings-subtitle">
              Change the board layout and manage custom tiles here.
            </p>
          </div>

          <button
            type="button"
            className="grid-settings-back-btn"
            onClick={() => navigate("/user-config")}
          >
            ← Back to Config
          </button>
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
                onClick={handleSave}
              >
                Save
              </button>
            </div>

            <p className="grid-settings-note">
              You can add custom tiles, move tiles around, delete tiles into blank spaces,
              or restore the board back to the default talkpage.
            </p>
          </section>
        </div>

        {(pendingCustomTile || isMoveMode || isDeleteMode) && (
          <div className="grid-placement-bar">
            <span className="grid-placement-bar__text">
              {pendingCustomTile &&
                `Custom tile ready: ${pendingCustomTile.label}. Category: ${pendingCustomTile.category}. Tap any tile below to place it. You will get a confirmation popup before it is added.`}

              {!pendingCustomTile && isMoveMode && !moveSourceTileId &&
                "Move mode is on. Tap the tile you want to move."}

              {!pendingCustomTile && isMoveMode && moveSourceTileId &&
                "Now tap the destination tile. Existing tiles will swap. Blank tiles will move the word and leave the old tile blank."}

              {!pendingCustomTile && isDeleteMode &&
                'Delete mode is on. Tap any tile below to delete it. You will get an in-app "Are you sure?" warning before it is removed.'}
            </span>

            <div className="grid-placement-bar__actions">
              {pendingCustomTile && (
                <button
                  type="button"
                  className="grid-placement-bar__btn"
                  onClick={addCustomToCurrentPage}
                >
                  Add to Current Page
                </button>
              )}

              {!pendingCustomTile && hasActiveEditMode && (
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
                    <span className="grid-preview-tile__label">{tile.label}</span>
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
                    pendingCustomTile ? "is-replaceable" : ""
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
                      <span className="grid-preview-tile__label">{tile.label}</span>
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
              <input type="file" accept="image/*" onChange={handleCustomImageChange} />
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

      {dialog && (
        <div className="grid-app-dialog-backdrop" onClick={closeDialog}>
          <div
            className={`grid-app-dialog ${
              dialog.tone ? `is-${dialog.tone}` : ""
            }`}
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