export type TalkAction =
  | "undo"
  | "clear"
  | "favorites"
  | "save"
  | "speak"
  | "previous"
  | "next"
  | "home";

export interface TalkControlButton {
  id: string;
  label: string;
  icon: string;
  action: TalkAction;
  accent: string;
  accentSoft: string;
}

export interface TalkBoardCell {
  id: string;
  type: "word" | "nav";
  icon: string;
  coreWordId?: string;
  fallbackLabel?: string;
  action?: TalkAction;
}

export const TALK_SAMPLE_SENTENCE = "I am hungry. I want a snack.";

export const TALK_CONTROLS: TalkControlButton[] = [
  {
    id: "undo",
    label: "Undo",
    icon: "↩",
    action: "undo",
    accent: "#f6a623",
    accentSoft: "#ffd67c",
  },
  {
    id: "clear",
    label: "Clear",
    icon: "✕",
    action: "clear",
    accent: "#ff6a3d",
    accentSoft: "#ff9d7d",
  },
  {
    id: "favorites",
    label: "Favorites",
    icon: "★",
    action: "favorites",
    accent: "#f2d224",
    accentSoft: "#ffe981",
  },
  {
    id: "save",
    label: "Save",
    icon: "💾",
    action: "save",
    accent: "#64c9ec",
    accentSoft: "#a6e8ff",
  },
  {
    id: "speak",
    label: "Speak!",
    icon: "🔊",
    action: "speak",
    accent: "#71d631",
    accentSoft: "#abe97e",
  },
];

export const TALK_BOARD_CELLS: TalkBoardCell[] = [
  { id: "cell-1", type: "word", icon: "🙂", coreWordId: "cw-011" }, // I
  { id: "cell-2", type: "word", icon: "🏃", coreWordId: "cw-010" }, // go
  { id: "cell-3", type: "word", icon: "🥤", coreWordId: "cw-028" }, // drink
  { id: "cell-4", type: "word", icon: "👉", coreWordId: "cw-019" }, // want
  { id: "cell-5", type: "word", icon: "😄", coreWordId: "cw-041" }, // happy
  { id: "cell-6", type: "word", icon: "☹️", coreWordId: "cw-042" }, // sad

  { id: "cell-7", type: "word", icon: "👤", coreWordId: "cw-012" }, // you
  { id: "cell-8", type: "word", icon: "⚽", coreWordId: "cw-029" }, // play
  { id: "cell-9", type: "word", icon: "🍎", coreWordId: "cw-027" }, // eat
  { id: "cell-10", type: "word", icon: "🤲", coreWordId: "cw-006" }, // help
  { id: "cell-11", type: "word", icon: "💭", coreWordId: "cw-026" }, // feel
  { id: "cell-12", type: "word", icon: "❗", coreWordId: "cw-021" }, // need

  {
    id: "cell-13",
    type: "nav",
    icon: "←",
    fallbackLabel: "Previous",
    action: "previous",
  },
  { id: "cell-14", type: "word", icon: "➕", coreWordId: "cw-007" }, // more
  { id: "cell-15", type: "word", icon: "✅", coreWordId: "cw-008" }, // all done
  {
    id: "cell-16",
    type: "nav",
    icon: "🏠",
    fallbackLabel: "Home",
    action: "home",
  },
  { id: "cell-17", type: "word", icon: "❤️", coreWordId: "cw-020" }, // like
  {
    id: "cell-18",
    type: "nav",
    icon: "→",
    fallbackLabel: "Next",
    action: "next",
  },
];