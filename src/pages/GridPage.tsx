import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/talkpage.css";
import "./GridPage.css";
import {
  useBoardConfig,
  GRID_LAYOUTS,
  type GridPreset,
  type WordTile,
} from "../context/BoardConfigContext";

import arrowLeftIcon from "../assets/images/icons/arrow_left.png";
import arrowRightIcon from "../assets/images/icons/arrow_right.png";
import homeIcon from "../assets/images/icons/home.png";
import pizzaIcon from "../assets/images/icons/pizza.png";

type CustomDraft = {
  label: string;
  imageSrc: string;
  fileName: string;
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

function defaultCustomDraft(): CustomDraft {
  return {
    label: "",
    imageSrc: pizzaIcon,
    fileName: "",
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
    category: "custom",
  };
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

export default function GridPage() {
  const navigate = useNavigate();
  const { boardTiles, gridPreset, setGridPreset, replaceTile } = useBoardConfig();

  const [currentPage, setCurrentPage] = useState(0);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(defaultCustomDraft());
  const [pendingCustomTile, setPendingCustomTile] = useState<WordTile | null>(null);

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

  const handlePresetChange = (preset: GridPreset) => {
    setGridPreset(preset);
    setCurrentPage(0);
  };

  const openCustomModal = () => {
    setCustomDraft(defaultCustomDraft());
    setIsCustomModalOpen(true);
  };

  const closeCustomModal = () => {
    setIsCustomModalOpen(false);
  };

  const cancelPlacementMode = () => {
    setPendingCustomTile(null);
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
    setIsCustomModalOpen(false);
  };

  const addCustomToCurrentPage = () => {
    if (!pendingCustomTile) return;

    const firstSampleTile = currentContentTiles.find(
      (tile) => tile.label === "[sample]"
    );

    if (!firstSampleTile) {
      window.alert("There is no open [sample] spot on this page. Tap a square to replace it.");
      return;
    }

    replaceTile(firstSampleTile.id, pendingCustomTile);
    setPendingCustomTile(null);
  };

  const handleWordTileClick = (tile: WordTile) => {
    if (!pendingCustomTile) return;

    replaceTile(tile.id, pendingCustomTile);
    setPendingCustomTile(null);
  };

  const handleNavTap = (tile: NavTile) => {
    if (tile.disabled) return;

    setCurrentPage((prev) => {
      if (tile.action === "previous") return Math.max(prev - 1, 0);
      return Math.min(prev + 1, totalPages - 1);
    });
  };

  const handleSave = () => {
    window.alert("Board settings are saved for this session. Local/device saving is the next step.");
  };

  return (
    <section className="grid-settings-page">
      <div className="grid-settings-shell">
        <button
          type="button"
          className="talk-home-badge"
          aria-label="Go to home page"
          onClick={() => navigate("/home")}
        >
          <img src={homeIcon} alt="" className="talk-home-badge__icon-img" />
          <span className="talk-home-badge__text">Home</span>
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
                className="grid-settings-action-btn is-save"
                onClick={handleSave}
              >
                Save
              </button>
            </div>

            <p className="grid-settings-note">
              Save is temporary for now. Local browser saving is next.
            </p>
          </section>
        </div>

        {pendingCustomTile && (
          <div className="talk-placement-bar">
            <span className="talk-placement-bar__text">
              Custom tile ready: <strong>{pendingCustomTile.label}</strong>. Tap any word square below to replace it, or add it to the current page.
            </span>

            <div className="talk-placement-bar__actions">
              <button
                type="button"
                className="talk-placement-bar__btn"
                onClick={addCustomToCurrentPage}
              >
                Add to Current Page
              </button>

              <button
                type="button"
                className="talk-placement-bar__btn is-cancel"
                onClick={cancelPlacementMode}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <section className="grid-settings-card grid-settings-preview-card">
          <div className="grid-settings-preview-header">
            <h2 className="grid-settings-card__title">Board Preview</h2>
            <span className="grid-settings-preview-meta">
              {layout.label} layout · {layout.cols} columns · {layout.rows} rows
            </span>
          </div>

          <div
            className={`talk-grid is-${gridPreset}`}
            style={{ "--talk-cols": layout.cols } as CSSProperties}
            aria-label="Grid preview"
          >
            {visibleTiles.map((tile) => {
              if (tile.type === "empty") {
                return <div key={tile.id} className="talk-tile is-empty" aria-hidden="true" />;
              }

              if (tile.type === "nav") {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`talk-tile is-nav ${
                      tile.disabled ? "is-disabled" : ""
                    }`}
                    onClick={() => handleNavTap(tile)}
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

              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`talk-tile is-word ${
                    pendingCustomTile ? "is-replaceable" : ""
                  }`}
                  onClick={() => handleWordTileClick(tile)}
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

          <div className="talk-page-indicator" aria-label={`Page ${currentPage + 1} of ${totalPages}`}>
            <span className="talk-page-indicator__text">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div className="talk-page-indicator__dots" aria-hidden="true">
              {Array.from({ length: totalPages }, (_, index) => (
                <span
                  key={`preview-page-dot-${index}`}
                  className={`talk-page-indicator__dot ${
                    index === currentPage ? "is-active" : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {isCustomModalOpen && (
        <div className="talk-custom-modal-backdrop" onClick={closeCustomModal}>
          <div
            className="talk-custom-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Create custom tile"
          >
            <h2 className="talk-custom-modal__title">Create Custom Tile</h2>

            <div className="talk-custom-preview">
              <div className="talk-custom-preview__icon">
                <img
                  src={customDraft.imageSrc || pizzaIcon}
                  alt=""
                  className="talk-custom-preview__img"
                />
              </div>
              <div className="talk-custom-preview__label">
                {customDraft.label.trim() || "[custom]"}
              </div>
            </div>

            <label className="talk-custom-modal__field">
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

            <label className="talk-custom-modal__field">
              <span>Image</span>
              <input type="file" accept="image/*" onChange={handleCustomImageChange} />
              <small>{customDraft.fileName || "No file selected yet"}</small>
            </label>

            <div className="talk-custom-modal__actions">
              <button
                type="button"
                className="talk-custom-modal__btn is-secondary"
                onClick={closeCustomModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="talk-custom-modal__btn"
                onClick={handleCustomDone}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}