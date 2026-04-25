//AA-64-Define-core-word-set-list-essential-high-frequency-AAC-words
//Author: Christian Beshara

//src/data/coreWords.ts

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

//coreword interface
export interface CoreWord {
  id: string;
  word: string;
  category: string;
  symbol?: string; //For future image symbol usage
}

function makeCoreWord(
  id: string,
  word: string,
  category: string,
  symbol: string
): CoreWord {
  return { id, word, category, symbol };
}

// {id, word, category, symbol (optional for future image symbol usage)} ,
export const coreWords: CoreWord[] = [
  // Basic words
  makeCoreWord("cw-001", "yes", "basic", happyIcon),
  makeCoreWord("cw-002", "no", "basic", sadIcon),
  makeCoreWord("cw-003", "please", "basic", helpIcon),
  makeCoreWord("cw-004", "thank you", "basic", happyIcon),
  makeCoreWord("cw-005", "sorry", "basic", sadIcon),
  makeCoreWord("cw-006", "help", "basic", helpIcon),
  makeCoreWord("cw-007", "more", "basic", pizzaIcon),
  makeCoreWord("cw-008", "all done", "basic", happyIcon),
  makeCoreWord("cw-009", "stop", "basic", sadIcon),
  makeCoreWord("cw-010", "go", "basic", goIcon),
  makeCoreWord("cw-011", "again", "basic", playIcon),
  makeCoreWord("cw-012", "hello", "basic", happyIcon),
  makeCoreWord("cw-013", "bye", "basic", homeIcon),
  makeCoreWord("cw-014", "okay", "basic", happyIcon),
  makeCoreWord("cw-015", "finished", "basic", happyIcon),
  makeCoreWord("cw-016", "here", "basic", homeIcon),
  makeCoreWord("cw-017", "there", "basic", homeIcon),
  makeCoreWord("cw-018", "this", "basic", phoneIcon),
  makeCoreWord("cw-019", "that", "basic", phoneIcon),
  makeCoreWord("cw-020", "what", "basic", phoneIcon),
  makeCoreWord("cw-021", "where", "basic", homeIcon),
  makeCoreWord("cw-022", "bathroom", "basic", homeIcon),
  makeCoreWord("cw-023", "water", "basic", drinkIcon),
  makeCoreWord("cw-024", "food", "basic", snackIcon),
  makeCoreWord("cw-025", "home", "basic", homeIcon),

  // Pronouns
  makeCoreWord("cw-026", "I", "pronoun", iIcon),
  makeCoreWord("cw-027", "you", "pronoun", iIcon),
  makeCoreWord("cw-028", "me", "pronoun", iIcon),
  makeCoreWord("cw-029", "my", "pronoun", iIcon),
  makeCoreWord("cw-030", "mine", "pronoun", iIcon),
  makeCoreWord("cw-031", "we", "pronoun", helpIcon),
  makeCoreWord("cw-032", "us", "pronoun", helpIcon),
  makeCoreWord("cw-033", "he", "pronoun", iIcon),
  makeCoreWord("cw-034", "she", "pronoun", iIcon),
  makeCoreWord("cw-035", "they", "pronoun", iIcon),
  makeCoreWord("cw-036", "it", "pronoun", phoneIcon),
  makeCoreWord("cw-037", "your", "pronoun", iIcon),

  // Verbs
  makeCoreWord("cw-038", "want", "verb", wantIcon),
  makeCoreWord("cw-039", "like", "verb", happyIcon),
  makeCoreWord("cw-040", "need", "verb", wantIcon),
  makeCoreWord("cw-041", "get", "verb", wantIcon),
  makeCoreWord("cw-042", "make", "verb", playIcon),
  makeCoreWord("cw-043", "look", "verb", phoneIcon),
  makeCoreWord("cw-044", "see", "verb", phoneIcon),
  makeCoreWord("cw-045", "feel", "verb", nervousIcon),
  makeCoreWord("cw-046", "eat", "verb", pizzaIcon),
  makeCoreWord("cw-047", "drink", "verb", drinkIcon),
  makeCoreWord("cw-048", "play", "verb", playIcon),
  makeCoreWord("cw-049", "come", "verb", goIcon),
  makeCoreWord("cw-050", "put", "verb", homeIcon),
  makeCoreWord("cw-051", "open", "verb", homeIcon),
  makeCoreWord("cw-052", "close", "verb", homeIcon),
  makeCoreWord("cw-053", "give", "verb", helpIcon),
  makeCoreWord("cw-054", "take", "verb", helpIcon),
  makeCoreWord("cw-055", "say", "verb", phoneIcon),
  makeCoreWord("cw-056", "tell", "verb", phoneIcon),
  makeCoreWord("cw-057", "know", "verb", nervousIcon),
  makeCoreWord("cw-058", "think", "verb", nervousIcon),
  makeCoreWord("cw-059", "hear", "verb", phoneIcon),
  makeCoreWord("cw-060", "watch", "verb", phoneIcon),
  makeCoreWord("cw-061", "read", "verb", phoneIcon),
  makeCoreWord("cw-062", "write", "verb", phoneIcon),
  makeCoreWord("cw-063", "walk", "verb", goIcon),
  makeCoreWord("cw-064", "run", "verb", goIcon),
  makeCoreWord("cw-065", "sit", "verb", tiredIcon),
  makeCoreWord("cw-066", "stand", "verb", iIcon),
  makeCoreWord("cw-067", "sleep", "verb", sleepIcon),
  makeCoreWord("cw-068", "wash", "verb", drinkIcon),
  makeCoreWord("cw-069", "find", "verb", nervousIcon),
  makeCoreWord("cw-070", "use", "verb", phoneIcon),

  // Descriptor Words
  makeCoreWord("cw-071", "big", "descriptor", homeIcon),
  makeCoreWord("cw-072", "little", "descriptor", snackIcon),
  makeCoreWord("cw-073", "good", "descriptor", happyIcon),
  makeCoreWord("cw-074", "bad", "descriptor", sadIcon),
  makeCoreWord("cw-075", "hot", "descriptor", drinkIcon),
  makeCoreWord("cw-076", "cold", "descriptor", drinkIcon),
  makeCoreWord("cw-077", "happy", "descriptor", happyIcon),
  makeCoreWord("cw-078", "sad", "descriptor", sadIcon),
  makeCoreWord("cw-079", "hurt", "descriptor", tiredIcon),
  makeCoreWord("cw-080", "tired", "descriptor", tiredIcon),
  makeCoreWord("cw-081", "nervous", "descriptor", nervousIcon),
  makeCoreWord("cw-082", "mad", "descriptor", sadIcon),
  makeCoreWord("cw-083", "scared", "descriptor", nervousIcon),
  makeCoreWord("cw-084", "sick", "descriptor", tiredIcon),
  makeCoreWord("cw-085", "hungry", "descriptor", hungryIcon),
  makeCoreWord("cw-086", "thirsty", "descriptor", drinkIcon),
  makeCoreWord("cw-087", "fast", "descriptor", goIcon),
  makeCoreWord("cw-088", "slow", "descriptor", tiredIcon),
  makeCoreWord("cw-089", "loud", "descriptor", phoneIcon),
  makeCoreWord("cw-090", "quiet", "descriptor", sleepIcon),
  makeCoreWord("cw-091", "clean", "descriptor", homeIcon),
  makeCoreWord("cw-092", "dirty", "descriptor", snackIcon),
  makeCoreWord("cw-093", "wet", "descriptor", drinkIcon),
  makeCoreWord("cw-094", "dry", "descriptor", snackIcon),
];