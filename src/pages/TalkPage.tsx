import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/talkpage.css";

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

type TalkAction = "undo" | "clear" | "favorites" | "save" | "speak";

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
    id: "favorites",
    label: "Favorites",
    icon: "★",
    action: "favorites",
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

const TALK_TILES: TalkTile[] = [
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
    id: "previous",
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
    id: "next",
    label: "Next",
    icon: arrowRightIcon,
    type: "nav",
    action: "next",
  },
];

const TalkPage = () => {
  const navigate = useNavigate();

  const [sentenceWords, setSentenceWords] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);

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

  const handleWordTap = (tile: WordTile) => {
    markPressed(tile.id);
    setSentenceWords((prev) => [...prev, tile.value]);

    console.log("[TalkPage] word tapped:", {
      word: tile.value,
      boardCellId: tile.id,
    });
  };

  const handleNavTap = (tile: NavTile) => {
    markPressed(tile.id);

    console.log("[TalkPage] nav action:", {
      action: tile.action,
      boardCellId: tile.id,
      label: tile.label,
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

      case "favorites":
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

        <div className="talk-grid" aria-label="AAC talk board">
          {TALK_TILES.map((tile) => {
            const isNav = tile.type === "nav";

            return (
              <button
                key={tile.id}
                type="button"
                className={`talk-tile ${isNav ? "is-nav" : "is-word"} ${
                  lastPressedId === tile.id ? "is-pressed" : ""
                }`}
                onClick={() =>
                  isNav ? handleNavTap(tile as NavTile) : handleWordTap(tile as WordTile)
                }
                aria-label={tile.label}
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
      </div>
    </section>
  );
};

export default TalkPage;