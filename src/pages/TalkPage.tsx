import { useState, type ChangeEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/talkpage.css";
import { speakWithSettings } from "../hooks/useTTSSettings";

import arrowLeftIcon from "../assets/images/icons/arrow_left.png";
import arrowRightIcon from "../assets/images/icons/arrow_right.png";
import drinkIcon from "../assets/images/icons/drink.png";
import goIcon from "../assets/images/icons/go.png";
import happyIcon from "../assets/images/icons/happy.png";
import helpIcon from "../assets/images/icons/help.png";
import homeIcon from "../assets/images/icons/home.png";
import hungryIcon from "../assets/images/icons/hungry.png";
import iIcon from "../assets/images/icons/I.png";
import nervousIcon from "../assets/images/icons/nervous.png";
import phoneIcon from "../assets/images/icons/phone.png";
import pizzaIcon from "../assets/images/icons/pizza.png";
import playIcon from "../assets/images/icons/play.png";
import sadIcon from "../assets/images/icons/sad.png";
import sleepIcon from "../assets/images/icons/sleep.png";
import snackIcon from "../assets/images/icons/snack.png";
import tiredIcon from "../assets/images/icons/tired.png";
import wantIcon from "../assets/images/icons/want.png";

type TalkAction = "undo" | "clear" | "custom" | "save" | "speak";

type TalkControl = {
  id: string;
  label: string;
  icon: string;
  action: TalkAction;
  accent: string;
  labelColor: string;
};

type WordTile = {
  id: string;
  label: string;
  value: string;
  icon: string;
  type: "word";
};

type NavTile = {
  id: string;
  label: string;
  icon: string;
  type: "nav";
  action: "previous" | "next";
};

type TalkTile = WordTile | NavTile;

type CustomDraft = {
  label: string;
  imageSrc: string;
  fileName: string;
};

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
    id: "custom",
    label: "Custom",
    icon: "★",
    action: "custom",
    accent: "#ECD234",
    labelColor: "#E6C400",
  },
  {
    id: "save",
    label: "Save",
    icon: "💾",
    action: "save",
    accent: "#6FC6EA",
    labelColor: "#5CBFEA",
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

const MAIN_PAGE: TalkTile[] = [
  { id: "i", label: "I", value: "I", icon: iIcon, type: "word" },
  { id: "go", label: "Go", value: "go", icon: goIcon, type: "word" },
  { id: "drink", label: "Drink", value: "drink", icon: drinkIcon, type: "word" },
  { id: "hungry", label: "Hungry", value: "hungry", icon: hungryIcon, type: "word" },
  { id: "happy", label: "Happy", value: "happy", icon: happyIcon, type: "word" },
  { id: "sad", label: "Sad", value: "sad", icon: sadIcon, type: "word" },

  { id: "phone", label: "Phone", value: "phone", icon: phoneIcon, type: "word" },
  { id: "play", label: "Play", value: "play", icon: playIcon, type: "word" },
  { id: "snack", label: "Snack", value: "snack", icon: snackIcon, type: "word" },
  { id: "sleep", label: "Sleep", value: "sleep", icon: sleepIcon, type: "word" },
  { id: "tired", label: "Tired", value: "tired", icon: tiredIcon, type: "word" },
  { id: "nervous", label: "Nervous", value: "nervous", icon: nervousIcon, type: "word" },

  {
    id: "main-previous",
    label: "Previous",
    icon: arrowLeftIcon,
    type: "nav",
    action: "previous",
  },
  { id: "help", label: "Help", value: "help", icon: helpIcon, type: "word" },
  { id: "home", label: "Home", value: "home", icon: homeIcon, type: "word" },
  { id: "pizza", label: "Pizza", value: "pizza", icon: pizzaIcon, type: "word" },
  { id: "want", label: "Want", value: "want", icon: wantIcon, type: "word" },
  {
    id: "main-next",
    label: "Next",
    icon: arrowRightIcon,
    type: "nav",
    action: "next",
  },
];

const makeSampleWord = (pageNumber: number, index: number): WordTile => ({
  id: `page-${pageNumber}-sample-${index}`,
  label: "[sample]",
  value: "sample",
  icon: pizzaIcon,
  type: "word",
});

const makeSamplePage = (pageNumber: number): TalkTile[] => [
  makeSampleWord(pageNumber, 1),
  makeSampleWord(pageNumber, 2),
  makeSampleWord(pageNumber, 3),
  makeSampleWord(pageNumber, 4),
  makeSampleWord(pageNumber, 5),
  makeSampleWord(pageNumber, 6),

  makeSampleWord(pageNumber, 7),
  makeSampleWord(pageNumber, 8),
  makeSampleWord(pageNumber, 9),
  makeSampleWord(pageNumber, 10),
  makeSampleWord(pageNumber, 11),
  makeSampleWord(pageNumber, 12),

  {
    id: `page-${pageNumber}-previous`,
    label: "Previous",
    icon: arrowLeftIcon,
    type: "nav",
    action: "previous",
  },
  makeSampleWord(pageNumber, 13),
  makeSampleWord(pageNumber, 14),
  makeSampleWord(pageNumber, 15),
  makeSampleWord(pageNumber, 16),
  {
    id: `page-${pageNumber}-next`,
    label: "Next",
    icon: arrowRightIcon,
    type: "nav",
    action: "next",
  },
];

const INITIAL_PAGES: TalkTile[][] = [MAIN_PAGE, makeSamplePage(2), makeSamplePage(3)];

const defaultCustomDraft = (): CustomDraft => ({
  label: "",
  imageSrc: pizzaIcon,
  fileName: "",
});

const buildCustomTile = (draft: CustomDraft): WordTile => {
  const cleanedLabel = draft.label.trim() || "[custom]";

  return {
    id: `custom-${Date.now()}`,
    label: cleanedLabel,
    value: cleanedLabel.toLowerCase(),
    icon: draft.imageSrc || pizzaIcon,
    type: "word",
  };
};

const TalkPage = () => {
  const navigate = useNavigate();

  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<TalkTile[][]>(INITIAL_PAGES);

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft>(defaultCustomDraft());
  const [pendingCustomTile, setPendingCustomTile] = useState<WordTile | null>(null);

  const displayedSentence = sentenceWords.join(" ");
  const totalPages = pages.length;
  const currentTiles = pages[currentPage];

  // Reads volume, rate, and voice from localStorage set in AudioPage
  const speakText = (text: string) => speakWithSettings(text);

  const markPressed = (id: string) => {
    setLastPressedId(id);

    window.setTimeout(() => {
      setLastPressedId((current) => (current === id ? null : current));
    }, 180);
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
    const tile = buildCustomTile(customDraft);
    setPendingCustomTile(tile);
    setIsCustomModalOpen(false);
  };

  const replaceTileOnCurrentPage = (targetTileId: string, newTile: WordTile) => {
    setPages((prev) =>
      prev.map((page, pageIndex) => {
        if (pageIndex !== currentPage) return page;

        return page.map((tile) =>
          tile.id === targetTileId
            ? {
                ...newTile,
                id: `${newTile.id}-${currentPage}-${targetTileId}`,
              }
            : tile
        );
      })
    );
  };

  const addCustomToCurrentPage = () => {
    if (!pendingCustomTile) return;

    const firstSampleTile = currentTiles.find(
      (tile): tile is WordTile => tile.type === "word" && tile.label === "[sample]"
    );

    if (!firstSampleTile) {
      window.alert("There is no open [sample] spot on this page. Tap a square to replace it.");
      return;
    }

    replaceTileOnCurrentPage(firstSampleTile.id, pendingCustomTile);
    setPendingCustomTile(null);
  };

  const handleWordTap = (tile: WordTile) => {
    if (pendingCustomTile) {
      replaceTileOnCurrentPage(tile.id, pendingCustomTile);
      setPendingCustomTile(null);
      return;
    }

    markPressed(tile.id);
    setSentenceWords((prev) => [...prev, tile.value]);

    console.log("[TalkPage] word tapped:", {
      word: tile.value,
      boardCellId: tile.id,
      page: currentPage + 1,
    });
  };

  const handleNavTap = (tile: NavTile) => {
    const isPreviousDisabled = tile.action === "previous" && currentPage === 0;
    const isNextDisabled = tile.action === "next" && currentPage === totalPages - 1;

    if (isPreviousDisabled || isNextDisabled) return;

    markPressed(tile.id);

    setCurrentPage((prev) => {
      if (tile.action === "previous") return Math.max(prev - 1, 0);
      return Math.min(prev + 1, totalPages - 1);
    });
  };

  const handleControlAction = (action: TalkAction, controlId: string) => {
    markPressed(controlId);

    switch (action) {
      case "undo":
        setSentenceWords((prev) => prev.slice(0, -1));
        break;

      case "clear":
        setSentenceWords([]);
        break;

      case "custom":
        openCustomModal();
        break;

      case "speak":
        speakText(displayedSentence);
        break;

      case "save":
      default:
        console.log("[TalkPage] control action:", {
          action,
          sentenceWords,
        });
        break;
    }
  };

  const handleSentenceBarClick = () => {
    speakText(displayedSentence);
  };

  return (
    <section className="talk-page">
      <div className="talk-board-shell">
        <button
          type="button"
          className="talk-home-badge"
          aria-label="Go to home page"
          onClick={() => navigate("/home")}
        >
          <img src={homeIcon} alt="" className="talk-home-badge__icon-img" />
          <span className="talk-home-badge__text">Home</span>
        </button>

        <button
          type="button"
          className={`talk-sentence-bar ${displayedSentence ? "" : "is-empty"}`}
          onClick={handleSentenceBarClick}
          aria-label="Sentence bar"
        >
          {displayedSentence || "\u00A0"}
        </button>

        <div className="talk-controls">
          {TALK_CONTROLS.map((control) => {
            const style = {
              "--accent": control.accent,
              "--label-color": control.labelColor,
            } as CSSProperties;

            return (
              <button
                key={control.id}
                type="button"
                className={`talk-control-btn ${
                  control.action === "speak" ? "is-speak" : ""
                } ${lastPressedId === control.id ? "is-pressed" : ""}`}
                style={style}
                onClick={() => handleControlAction(control.action, control.id)}
                aria-label={control.label}
              >
                <span className="talk-control-btn__icon">{control.icon}</span>
                <span className="talk-control-btn__label">{control.label}</span>
              </button>
            );
          })}
        </div>

        {pendingCustomTile && (
          <div className="talk-placement-bar">
            <span className="talk-placement-bar__text">
              Custom tile ready: <strong>{pendingCustomTile.label}</strong>. Tap any word square to replace it, or add it to the current page.
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

        <div className="talk-grid" aria-label="AAC talk board">
          {currentTiles.map((tile) => {
            const isNav = tile.type === "nav";
            const isDisabledNav =
              isNav &&
              ((tile.action === "previous" && currentPage === 0) ||
                (tile.action === "next" && currentPage === totalPages - 1));

            return (
              <button
                key={tile.id}
                type="button"
                className={`talk-tile ${isNav ? "is-nav" : "is-word"} ${
                  lastPressedId === tile.id ? "is-pressed" : ""
                } ${isDisabledNav ? "is-disabled" : ""} ${
                  pendingCustomTile && !isNav ? "is-replaceable" : ""
                }`}
                onClick={() =>
                  isNav ? handleNavTap(tile as NavTile) : handleWordTap(tile as WordTile)
                }
                aria-label={tile.label}
                aria-disabled={isDisabledNav}
                data-action={isNav ? tile.action : ""}
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

        <div
          className="talk-page-indicator"
          aria-label={`Page ${currentPage + 1} of ${totalPages}`}
        >
          <span className="talk-page-indicator__text">
            Page {currentPage + 1} of {totalPages}
          </span>

          <div className="talk-page-indicator__dots" aria-hidden="true">
            {pages.map((_, index) => (
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
};

export default TalkPage;