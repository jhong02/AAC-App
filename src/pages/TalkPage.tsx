import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { coreWords } from "../data/coreWords";
import {
  TALK_BOARD_CELLS,
  TALK_CONTROLS,
  type TalkAction,
  type TalkBoardCell,
} from "../data/talkBoard";
import "../styles/talkpage.css";

type ResolvedTalkCell = TalkBoardCell & {
  label: string;
  value: string;
  category?: string;
};

const TalkPage = () => {
  const navigate = useNavigate();

  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);

  const coreWordMap = useMemo(() => {
    return new Map(coreWords.map((word) => [word.id, word]));
  }, []);

  const resolvedCells = useMemo<ResolvedTalkCell[]>(() => {
    return TALK_BOARD_CELLS.map((cell) => {
      if (cell.type === "nav") {
        return {
          ...cell,
          label: cell.fallbackLabel ?? "[nav]",
          value: cell.fallbackLabel ?? "[nav]",
        };
      }

      const matchedWord = cell.coreWordId
        ? coreWordMap.get(cell.coreWordId)
        : undefined;

      return {
        ...cell,
        label: matchedWord?.word ?? "[sample]",
        value: matchedWord?.word ?? "[sample]",
        category: matchedWord?.category,
      };
    });
  }, [coreWordMap]);

  const displayedSentence = sentenceWords.join(" ");

  const speakText = (text: string) => {
    if (!text.trim()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const markPressed = (id: string) => {
    setLastPressedId(id);
    window.setTimeout(() => {
      setLastPressedId((current) => (current === id ? null : current));
    }, 180);
  };

  const handleWordTap = (cell: ResolvedTalkCell) => {
    markPressed(cell.id);
    setSentenceWords((prev) => [...prev, cell.value]);

    console.log("[TalkPage] word tapped:", {
      coreWordId: cell.coreWordId,
      word: cell.value,
      category: cell.category,
      boardCellId: cell.id,
    });
  };

  const handleNavAction = (cell: ResolvedTalkCell) => {
  markPressed(cell.id);

  // Make the Home tile act like a regular word button
  if (cell.action === "home") {
    setSentenceWords((prev) => [...prev, cell.label]);

    console.log("[TalkPage] home tile tapped like word:", {
      word: cell.label,
      boardCellId: cell.id,
    });

    return;
  }

  console.log("[TalkPage] nav action:", {
    action: cell.action,
    boardCellId: cell.id,
    label: cell.label,
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

      case "home":
        navigate("/");
        break;

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

    console.log("[TalkPage] sentence bar clicked:", {
      sentence: displayedSentence,
      words: sentenceWords,
    });
  };

  return (
    <section className="talk-page">
      <div className="talk-board-shell">
        <button
          type="button"
          className="talk-home-badge"
          aria-label="Go to home page"
          onClick={() => navigate("/")}
        >
          <span className="talk-home-badge__icon">🏠</span>
          <span className="talk-home-badge__text">Home</span>
        </button>

        <button
          type="button"
          className={`talk-sentence-bar ${
            displayedSentence ? "" : "is-empty"
          }`}
          onClick={handleSentenceBarClick}
          aria-label="Sentence bar"
        >
          {displayedSentence || "\u00A0"}
        </button>

        <div className="talk-controls">
          {TALK_CONTROLS.map((control) => {
            const style = {
              "--accent": control.accent,
              "--accent-soft": control.accentSoft,
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

        <div className="talk-grid" aria-label="AAC talk board">
          {resolvedCells.map((cell) => {
            const isNav = cell.type === "nav";

            return (
              <button
                key={cell.id}
                type="button"
                className={`talk-tile ${isNav ? "is-nav" : "is-word"} ${
                  lastPressedId === cell.id ? "is-pressed" : ""
                }`}
                onClick={() =>
                  isNav ? handleNavAction(cell) : handleWordTap(cell)
                }
                aria-label={cell.label}
                data-core-word-id={cell.coreWordId ?? ""}
                data-category={cell.category ?? ""}
                data-action={cell.action ?? ""}
              >
                <span className="talk-tile__icon">{cell.icon}</span>
                <span className="talk-tile__label">{cell.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TalkPage;