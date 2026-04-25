import {
  createContext,
  useContext,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useBoardSettings } from "../hooks/useBoardSettings";
import { coreWords } from "../data/coreWords";
import pizzaIcon from "../assets/images/icons/pizza.png";

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

function formatBoardLabel(word: string): string {
  return word
    .split(" ")
    .map((part) => {
      if (part.toLowerCase() === "i") return "I";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

const MAIN_WORD_TILES: WordTile[] = coreWords.map((word) => ({
  id: word.id,
  label: formatBoardLabel(word.word),
  value: word.word,
  icon: word.symbol ?? pizzaIcon,
  type: "word",
  category: word.category,
}));

export const INITIAL_BOARD_TILES: WordTile[] = [...MAIN_WORD_TILES];

type BoardConfigContextValue = {
  gridPreset: GridPreset;
  setGridPreset: Dispatch<SetStateAction<GridPreset>>;
  boardTiles: WordTile[];
  setBoardTiles: Dispatch<SetStateAction<WordTile[]>>;
  replaceTile: (targetTileId: string, nextTile: WordTile) => void;
};

const BoardConfigContext = createContext<BoardConfigContextValue | null>(null);

export function BoardConfigProvider({ children }: { children: ReactNode }) {
  const { gridPreset, setGridPreset, boardTiles, setBoardTiles } = useBoardSettings();

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