import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";

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

export type GridPreset = "default" | "medium" | "large";

export type WordTile = {
  id: string;
  label: string;
  value: string;
  icon: string;
  type: "word";
  category?: string;
};

type GridLayout = {
  label: string;
  cols: number;
  rows: number;
};

export const GRID_LAYOUTS: Record<GridPreset, GridLayout> = {
  default: { label: "Default", cols: 6, rows: 3 },
  medium: { label: "Medium", cols: 10, rows: 5 },
  large: { label: "Large", cols: 12, rows: 8 },
};

const MAIN_WORD_TILES: WordTile[] = [
  { id: "i", label: "I", value: "I", icon: iIcon, type: "word", category: "pronoun" },
  { id: "go", label: "Go", value: "go", icon: goIcon, type: "word", category: "verb" },
  { id: "drink", label: "Drink", value: "drink", icon: drinkIcon, type: "word", category: "verb" },
  { id: "hungry", label: "Hungry", value: "hungry", icon: hungryIcon, type: "word", category: "descriptor" },
  { id: "happy", label: "Happy", value: "happy", icon: happyIcon, type: "word", category: "descriptor" },
  { id: "sad", label: "Sad", value: "sad", icon: sadIcon, type: "word", category: "descriptor" },

  { id: "phone", label: "Phone", value: "phone", icon: phoneIcon, type: "word", category: "basic" },
  { id: "play", label: "Play", value: "play", icon: playIcon, type: "word", category: "verb" },
  { id: "snack", label: "Snack", value: "snack", icon: snackIcon, type: "word", category: "basic" },
  { id: "sleep", label: "Sleep", value: "sleep", icon: sleepIcon, type: "word", category: "verb" },
  { id: "tired", label: "Tired", value: "tired", icon: tiredIcon, type: "word", category: "descriptor" },
  { id: "nervous", label: "Nervous", value: "nervous", icon: nervousIcon, type: "word", category: "descriptor" },

  { id: "help", label: "Help", value: "help", icon: helpIcon, type: "word", category: "basic" },
  { id: "home", label: "Home", value: "home", icon: homeIcon, type: "word", category: "basic" },
  { id: "pizza", label: "Pizza", value: "pizza", icon: pizzaIcon, type: "word", category: "basic" },
  { id: "want", label: "Want", value: "want", icon: wantIcon, type: "word", category: "verb" },
];

const SAMPLE_WORD_TILES: WordTile[] = Array.from({ length: 32 }, (_, index) => ({
  id: `sample-${index + 1}`,
  label: "[sample]",
  value: "sample",
  icon: pizzaIcon,
  type: "word",
  category: "sample",
}));

const INITIAL_BOARD_TILES: WordTile[] = [...MAIN_WORD_TILES, ...SAMPLE_WORD_TILES];

type BoardConfigContextValue = {
  gridPreset: GridPreset;
  setGridPreset: Dispatch<SetStateAction<GridPreset>>;
  boardTiles: WordTile[];
  setBoardTiles: Dispatch<SetStateAction<WordTile[]>>;
  replaceTile: (targetTileId: string, nextTile: WordTile) => void;
};

const BoardConfigContext = createContext<BoardConfigContextValue | null>(null);

export function BoardConfigProvider({ children }: { children: ReactNode }) {
  const [gridPreset, setGridPreset] = useState<GridPreset>("default");
  const [boardTiles, setBoardTiles] = useState<WordTile[]>(INITIAL_BOARD_TILES);

  const replaceTile = (targetTileId: string, nextTile: WordTile) => {
    setBoardTiles((prev) =>
      prev.map((tile) =>
        tile.id === targetTileId
          ? {
              ...nextTile,
              id: targetTileId,
            }
          : tile
      )
    );
  };

  return (
    <BoardConfigContext.Provider
      value={{
        gridPreset,
        setGridPreset,
        boardTiles,
        setBoardTiles,
        replaceTile,
      }}
    >
      {children}
    </BoardConfigContext.Provider>
  );
}

export function useBoardConfig() {
  const context = useContext(BoardConfigContext);

  if (!context) {
    throw new Error("useBoardConfig must be used inside BoardConfigProvider");
  }

  return context;
}