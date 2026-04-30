//AA-64-Define-core-word-set-list-essential-high-frequency-AAC-words
//Author: Christian Beshara

//src/data/coreWords.ts

import againIcon from "../assets/images/icons/again.png";
import allDoneIcon from "../assets/images/icons/alldone.png";
import badIcon from "../assets/images/icons/bad.png";
import bathroomIcon from "../assets/images/icons/bathroom.png";
import bigIcon from "../assets/images/icons/big.png";
import byeIcon from "../assets/images/icons/bye.png";
import cleanIcon from "../assets/images/icons/clean.png";
import closeIcon from "../assets/images/icons/close.png";
import coldIcon from "../assets/images/icons/cold.png";
import comeIcon from "../assets/images/icons/come.png";
import dirtyIcon from "../assets/images/icons/dirty.png";
import drinkIcon from "../assets/images/icons/drink.png";
import dryIcon from "../assets/images/icons/dry.png";
import eatIcon from "../assets/images/icons/eat.png";
import fastIcon from "../assets/images/icons/fast.png";
import feelIcon from "../assets/images/icons/feel.png";
import findIcon from "../assets/images/icons/find.png";
import finishedIcon from "../assets/images/icons/alldone.png";
import foodIcon from "../assets/images/icons/food.png";
import getIcon from "../assets/images/icons/get.png";
import giveIcon from "../assets/images/icons/give.png";
import goIcon from "../assets/images/icons/go.png";
import goodIcon from "../assets/images/icons/good.png";
import happyIcon from "../assets/images/icons/happy.png";
import heIcon from "../assets/images/icons/he.png";
import hearIcon from "../assets/images/icons/hear.png";
import helloIcon from "../assets/images/icons/hello.png";
import helpIcon from "../assets/images/icons/help.png";
import hereIcon from "../assets/images/icons/here.png";
import homeIcon from "../assets/images/icons/home.png";
import hotIcon from "../assets/images/icons/hot.png";
import hungryIcon from "../assets/images/icons/hungry.png";
import hurtIcon from "../assets/images/icons/hurt.png";
import iIcon from "../assets/images/icons/I.png";
import itIcon from "../assets/images/icons/it.png";
import knowIcon from "../assets/images/icons/know.png";
import likeIcon from "../assets/images/icons/like.png";
import littleIcon from "../assets/images/icons/little.png";
import lookIcon from "../assets/images/icons/look.png";
import loudIcon from "../assets/images/icons/loud.png";
import madIcon from "../assets/images/icons/mad.png";
import makeIcon from "../assets/images/icons/make.png";
import meIcon from "../assets/images/icons/me.png";
import mineIcon from "../assets/images/icons/mine.png";
import moreIcon from "../assets/images/icons/more.png";
import myIcon from "../assets/images/icons/my.png";
import needIcon from "../assets/images/icons/need.png";
import nervousIcon from "../assets/images/icons/nervous.png";
import noIcon from "../assets/images/icons/no.png";
import okIcon from "../assets/images/icons/ok.png";
import openIcon from "../assets/images/icons/open.png";
import playIcon from "../assets/images/icons/play.png";
import pleaseIcon from "../assets/images/icons/please.png";
import putIcon from "../assets/images/icons/put.png";
import quietIcon from "../assets/images/icons/quiet.png";
import readIcon from "../assets/images/icons/read.png";
import runIcon from "../assets/images/icons/run.png";
import sadIcon from "../assets/images/icons/sad.png";
import sayIcon from "../assets/images/icons/say.png";
import scaredIcon from "../assets/images/icons/scared.png";
import seeIcon from "../assets/images/icons/see.png";
import sheIcon from "../assets/images/icons/she.png";
import sickIcon from "../assets/images/icons/sick.png";
import sitIcon from "../assets/images/icons/sit.png";
import sleepIcon from "../assets/images/icons/sleep.png";
import slowIcon from "../assets/images/icons/slow.png";
import sorryIcon from "../assets/images/icons/sorry.png";
import standIcon from "../assets/images/icons/stand.png";
import stopIcon from "../assets/images/icons/stop.png";
import takeIcon from "../assets/images/icons/take.png";
import tellIcon from "../assets/images/icons/tell.png";
import thankYouIcon from "../assets/images/icons/thankyou.png";
import thatIcon from "../assets/images/icons/that.png";
import thereIcon from "../assets/images/icons/there.png";
import theyIcon from "../assets/images/icons/they.png";
import thinkIcon from "../assets/images/icons/think.png";
import thirstyIcon from "../assets/images/icons/thirsty.png";
import thisIcon from "../assets/images/icons/this.png";
import tiredIcon from "../assets/images/icons/tired.png";
import usIcon from "../assets/images/icons/us.png";
import useIcon from "../assets/images/icons/use.png";
import walkIcon from "../assets/images/icons/walk.png";
import wantIcon from "../assets/images/icons/want.png";
import washIcon from "../assets/images/icons/wash.png";
import watchIcon from "../assets/images/icons/watch.png";
import waterIcon from "../assets/images/icons/water.png";
import weIcon from "../assets/images/icons/we.png";
import wetIcon from "../assets/images/icons/wet.png";
import whatIcon from "../assets/images/icons/what.png";
import whereIcon from "../assets/images/icons/where.png";
import writeIcon from "../assets/images/icons/write.png";
import yesIcon from "../assets/images/icons/yes.png";
import youIcon from "../assets/images/icons/you.png";
import yourIcon from "../assets/images/icons/your.png";

//coreword interface
export interface CoreWord {
  id: string;
  word: string;
  category: string;
  symbol?: string;
}

function makeCoreWord(
  id: string,
  word: string,
  category: string,
  symbol: string
): CoreWord {
  return { id, word, category, symbol };
}

export const coreWords: CoreWord[] = [
  // Basic words
  makeCoreWord("cw-001", "yes", "basic", yesIcon),
  makeCoreWord("cw-002", "no", "basic", noIcon),
  makeCoreWord("cw-003", "please", "basic", pleaseIcon),
  makeCoreWord("cw-004", "thank you", "basic", thankYouIcon),
  makeCoreWord("cw-005", "sorry", "basic", sorryIcon),
  makeCoreWord("cw-006", "help", "basic", helpIcon),
  makeCoreWord("cw-007", "more", "basic", moreIcon),
  makeCoreWord("cw-008", "all done", "basic", allDoneIcon),
  makeCoreWord("cw-009", "stop", "basic", stopIcon),
  makeCoreWord("cw-010", "go", "basic", goIcon),
  makeCoreWord("cw-011", "again", "basic", againIcon),
  makeCoreWord("cw-012", "hello", "basic", helloIcon),
  makeCoreWord("cw-013", "bye", "basic", byeIcon),
  makeCoreWord("cw-014", "okay", "basic", okIcon),
  makeCoreWord("cw-015", "finished", "basic", finishedIcon),
  makeCoreWord("cw-016", "here", "basic", hereIcon),
  makeCoreWord("cw-017", "there", "basic", thereIcon),
  makeCoreWord("cw-018", "this", "basic", thisIcon),
  makeCoreWord("cw-019", "that", "basic", thatIcon),
  makeCoreWord("cw-020", "what", "basic", whatIcon),
  makeCoreWord("cw-021", "where", "basic", whereIcon),
  makeCoreWord("cw-022", "bathroom", "basic", bathroomIcon),
  makeCoreWord("cw-023", "water", "basic", waterIcon),
  makeCoreWord("cw-024", "food", "basic", foodIcon),
  makeCoreWord("cw-025", "home", "basic", homeIcon),

  // Pronouns
  makeCoreWord("cw-026", "I", "pronoun", iIcon),
  makeCoreWord("cw-027", "you", "pronoun", youIcon),
  makeCoreWord("cw-028", "me", "pronoun", meIcon),
  makeCoreWord("cw-029", "my", "pronoun", myIcon),
  makeCoreWord("cw-030", "mine", "pronoun", mineIcon),
  makeCoreWord("cw-031", "we", "pronoun", weIcon),
  makeCoreWord("cw-032", "us", "pronoun", usIcon),
  makeCoreWord("cw-033", "he", "pronoun", heIcon),
  makeCoreWord("cw-034", "she", "pronoun", sheIcon),
  makeCoreWord("cw-035", "they", "pronoun", theyIcon),
  makeCoreWord("cw-036", "it", "pronoun", itIcon),
  makeCoreWord("cw-037", "your", "pronoun", yourIcon),

  // Verbs
  makeCoreWord("cw-038", "want", "verb", wantIcon),
  makeCoreWord("cw-039", "like", "verb", likeIcon),
  makeCoreWord("cw-040", "need", "verb", needIcon),
  makeCoreWord("cw-041", "get", "verb", getIcon),
  makeCoreWord("cw-042", "make", "verb", makeIcon),
  makeCoreWord("cw-043", "look", "verb", lookIcon),
  makeCoreWord("cw-044", "see", "verb", seeIcon),
  makeCoreWord("cw-045", "feel", "verb", feelIcon),
  makeCoreWord("cw-046", "eat", "verb", eatIcon),
  makeCoreWord("cw-047", "drink", "verb", drinkIcon),
  makeCoreWord("cw-048", "play", "verb", playIcon),
  makeCoreWord("cw-049", "come", "verb", comeIcon),
  makeCoreWord("cw-050", "put", "verb", putIcon),
  makeCoreWord("cw-051", "open", "verb", openIcon),
  makeCoreWord("cw-052", "close", "verb", closeIcon),
  makeCoreWord("cw-053", "give", "verb", giveIcon),
  makeCoreWord("cw-054", "take", "verb", takeIcon),
  makeCoreWord("cw-055", "say", "verb", sayIcon),
  makeCoreWord("cw-056", "tell", "verb", tellIcon),
  makeCoreWord("cw-057", "know", "verb", knowIcon),
  makeCoreWord("cw-058", "think", "verb", thinkIcon),
  makeCoreWord("cw-059", "hear", "verb", hearIcon),
  makeCoreWord("cw-060", "watch", "verb", watchIcon),
  makeCoreWord("cw-061", "read", "verb", readIcon),
  makeCoreWord("cw-062", "write", "verb", writeIcon),
  makeCoreWord("cw-063", "walk", "verb", walkIcon),
  makeCoreWord("cw-064", "run", "verb", runIcon),
  makeCoreWord("cw-065", "sit", "verb", sitIcon),
  makeCoreWord("cw-066", "stand", "verb", standIcon),
  makeCoreWord("cw-067", "sleep", "verb", sleepIcon),
  makeCoreWord("cw-068", "wash", "verb", washIcon),
  makeCoreWord("cw-069", "find", "verb", findIcon),
  makeCoreWord("cw-070", "use", "verb", useIcon),

  // Descriptor words
  makeCoreWord("cw-071", "big", "descriptor", bigIcon),
  makeCoreWord("cw-072", "little", "descriptor", littleIcon),
  makeCoreWord("cw-073", "good", "descriptor", goodIcon),
  makeCoreWord("cw-074", "bad", "descriptor", badIcon),
  makeCoreWord("cw-075", "hot", "descriptor", hotIcon),
  makeCoreWord("cw-076", "cold", "descriptor", coldIcon),
  makeCoreWord("cw-077", "happy", "descriptor", happyIcon),
  makeCoreWord("cw-078", "sad", "descriptor", sadIcon),
  makeCoreWord("cw-079", "hurt", "descriptor", hurtIcon),
  makeCoreWord("cw-080", "tired", "descriptor", tiredIcon),
  makeCoreWord("cw-081", "nervous", "descriptor", nervousIcon),
  makeCoreWord("cw-082", "mad", "descriptor", madIcon),
  makeCoreWord("cw-083", "scared", "descriptor", scaredIcon),
  makeCoreWord("cw-084", "sick", "descriptor", sickIcon),
  makeCoreWord("cw-085", "hungry", "descriptor", hungryIcon),
  makeCoreWord("cw-086", "thirsty", "descriptor", thirstyIcon),
  makeCoreWord("cw-087", "fast", "descriptor", fastIcon),
  makeCoreWord("cw-088", "slow", "descriptor", slowIcon),
  makeCoreWord("cw-089", "loud", "descriptor", loudIcon),
  makeCoreWord("cw-090", "quiet", "descriptor", quietIcon),
  makeCoreWord("cw-091", "clean", "descriptor", cleanIcon),
  makeCoreWord("cw-092", "dirty", "descriptor", dirtyIcon),
  makeCoreWord("cw-093", "wet", "descriptor", wetIcon),
  makeCoreWord("cw-094", "dry", "descriptor", dryIcon),
];