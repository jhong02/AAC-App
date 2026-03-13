//AA-64-Define-core-word-set-list-essential-high-frequency-AAC-words
//Author: Christian Beshara

//src/data/coreWords.ts


//coreword interface
export interface CoreWord {
    id: string;
    word: string;
    category: string;
    symbol?: string; //For future image symbol usage
}

// {id, word, category, symbol (optional for future image symbol usage)} ,
export const coreWords: CoreWord[] = [
    //Basic words
    {id:"cw-001", word:"yes", category:"basic"},
    {id:"cw-002", word:"no", category:"basic"},
    {id:"cw-003", word:"please", category:"basic"},
    {id:"cw-004", word:"thank you", category:"basic"},
    {id:"cw-005", word:"sorry", category:"basic"},
    {id:"cw-006", word:"help", category:"basic"},
    {id:"cw-007", word:"more", category:"basic"},
    {id:"cw-008", word:"all done", category:"basic"},
    {id:"cw-009", word:"stop", category:"basic"},
    {id:"cw-010", word:"go", category:"basic"},
    
    //Pronouns
    {id:"cw-011", word:"I", category:"pronoun"},
    {id:"cw-012", word:"you", category:"pronoun"},
    {id:"cw-013", word:"he", category:"pronoun"},
    {id:"cw-014", word:"she", category:"pronoun"},
    {id:"cw-015", word:"we", category:"pronoun"},
    {id:"cw-016", word:"they", category:"pronoun"},

    //Verbs
    { id: "cw-019", word: "want", category: "verb" },
    { id: "cw-020", word: "like", category: "verb" },
    { id: "cw-021", word: "need", category: "verb" },
    { id: "cw-022", word: "get", category: "verb" },
    { id: "cw-023", word: "make", category: "verb" },
    { id: "cw-024", word: "look", category: "verb" },
    { id: "cw-025", word: "see", category: "verb" },
    { id: "cw-026", word: "feel", category: "verb" },
    { id: "cw-027", word: "eat", category: "verb" },
    { id: "cw-028", word: "drink", category: "verb" },
    { id: "cw-029", word: "play", category: "verb" },
    { id: "cw-030", word: "come", category: "verb" },
    { id: "cw-031", word: "put", category: "verb" },
    { id: "cw-032", word: "open", category: "verb" },
    { id: "cw-033", word: "close", category: "verb" },
    { id: "cw-034", word: "give", category: "verb" },


    //Descriptor Words
    { id: "cw-035", word: "big", category: "descriptor" },
    { id: "cw-036", word: "little", category: "descriptor" },
    { id: "cw-037", word: "good", category: "descriptor" },
    { id: "cw-038", word: "bad", category: "descriptor" },
    { id: "cw-039", word: "hot", category: "descriptor" },
    { id: "cw-040", word: "cold", category: "descriptor" },
    { id: "cw-041", word: "happy", category: "descriptor" },
    { id: "cw-042", word: "sad", category: "descriptor" },
    { id: "cw-043", word: "hurt", category: "descriptor" },
    { id: "cw-044", word: "all done", category: "descriptor" },
];