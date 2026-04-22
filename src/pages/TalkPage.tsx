/**
 * TalkPage.tsx
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import "../styles/talkpage.css";
import { speakWithSettings } from "../hooks/useTTSSettings";
import { useDatabase } from "../hooks/useDatabase";
import {
  useBoardConfig,
  GRID_LAYOUTS,
  type WordTile,
} from "../context/BoardConfigContext";
import { useSessionLogger } from "../hooks/useSessionLogger" //for session logging

import arrowLeftIcon from "../assets/images/icons/arrow_left.png";
import arrowRightIcon from "../assets/images/icons/arrow_right.png";
import homeIcon from "../assets/images/icons/home.png";


type TalkAction = "undo" | "clear" | "speak";

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
    id: "speak",
    label: "Speak!",
    icon: "🔊",
    action: "speak",
    accent: "#7BD531",
    labelColor: "#6FCF26",
  },
];

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

const TalkPage = () => {
  const navigate = useNavigate();

  const { boardTiles, gridPreset } = useBoardConfig();
  const { logTap } = useSessionLogger();
  const { db } = useDatabase();
  const layout = GRID_LAYOUTS[gridPreset];


  // ── UI state ──────────────────────────────────────────────────────────────
  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const displayedSentence = sentenceWords.join(" ");

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

  const speakText = (text: string) => {
    if (!text.trim()) return;
    speakWithSettings(text, undefined, db ?? undefined);
  };

  const markPressed = (id: string) => {
    setLastPressedId(id);
    window.setTimeout(() => {
      setLastPressedId((current) => (current === id ? null : current));
    }, 180);
  };

  const handleWordTap = (tile: WordTile) => {
    markPressed(tile.id);

    setSentenceWords((prev) => {
      logTap(tile.value, prev.length); // ← add here
      return [...prev, tile.value];
    });
  };

  const handleNavTap = (tile: NavTile) => {
    if (tile.disabled) return;

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
      case "speak":
        speakText(displayedSentence);
        break;
      default:
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

        <div
          className={`talk-grid is-${gridPreset}`}
          style={{ "--talk-cols": layout.cols } as CSSProperties}
          aria-label="AAC talk board"
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
                    lastPressedId === tile.id ? "is-pressed" : ""
                  } ${tile.disabled ? "is-disabled" : ""}`}
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
                  lastPressedId === tile.id ? "is-pressed" : ""
                }`}
                onClick={() => handleWordTap(tile)}
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
                key={`page-dot-${index}`}
                className={`talk-page-indicator__dot ${
                  index === currentPage ? "is-active" : ""
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TalkPage;