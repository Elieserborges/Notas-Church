export interface BibleVerse {
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BibleChapter {
    reference: string;
    verses: BibleVerse[];
    text: string; // all text
    translation_id: string;
    translation_name: string;
    translation_note: string;
}

const BASE_URL = 'https://bible-api.com';

export async function getBibleChapter(book: string, chapter: number, translation: string = 'almeida'): Promise<BibleChapter | null> {
    try {
        // bible-api.com supports almeida (Portuguese)
        const response = await fetch(`${BASE_URL}/${book}+${chapter}?translation=${translation}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Error fetching chapter:", error);
        return null;
    }
}

// Helper to list books (Hardcoded for MVP as usage is simple, 
// or could fetch from an endpoint if available. For 'bible-api.com', 
// we assume standard English names or map them.
// Let's use a simple mapping for PT-BR display -> English query)
export const BIBLE_BOOKS = [
    { value: 'Genesis', label: 'Gênesis' },
    { value: 'Exodus', label: 'Êxodo' },
    { value: 'Leviticus', label: 'Levítico' },
    { value: 'Numbers', label: 'Números' },
    { value: 'Deuteronomy', label: 'Deuteronômio' },
    { value: 'Joshua', label: 'Josué' },
    { value: 'Judges', label: 'Juízes' },
    { value: 'Ruth', label: 'Rute' },
    { value: '1 Samuel', label: '1 Samuel' },
    { value: '2 Samuel', label: '2 Samuel' },
    { value: '1 Kings', label: '1 Reis' },
    { value: '2 Kings', label: '2 Reis' },
    { value: '1 Chronicles', label: '1 Crônicas' },
    { value: '2 Chronicles', label: '2 Crônicas' },
    { value: 'Ezra', label: 'Esdras' },
    { value: 'Nehemiah', label: 'Neemias' },
    { value: 'Esther', label: 'Ester' },
    { value: 'Job', label: 'Jó' },
    { value: 'Psalms', label: 'Salmos' },
    { value: 'Proverbs', label: 'Provérbios' },
    { value: 'Ecclesiastes', label: 'Eclesiastes' },
    { value: 'Song of Solomon', label: 'Cânticos' },
    { value: 'Isaiah', label: 'Isaías' },
    { value: 'Jeremiah', label: 'Jeremias' },
    { value: 'Lamentations', label: 'Lamentações' },
    { value: 'Ezekiel', label: 'Ezequiel' },
    { value: 'Daniel', label: 'Daniel' },
    { value: 'Hosea', label: 'Oseias' },
    { value: 'Joel', label: 'Joel' },
    { value: 'Amos', label: 'Amós' },
    { value: 'Obadiah', label: 'Obadias' },
    { value: 'Jonah', label: 'Jonas' },
    { value: 'Micah', label: 'Miqueias' },
    { value: 'Nahum', label: 'Naum' },
    { value: 'Habakkuk', label: 'Habacuque' },
    { value: 'Zephaniah', label: 'Sofonias' },
    { value: 'Haggai', label: 'Ageu' },
    { value: 'Zechariah', label: 'Zacarias' },
    { value: 'Malachi', label: 'Malaquias' },
    { value: 'Matthew', label: 'Mateus' },
    { value: 'Mark', label: 'Marcos' },
    { value: 'Luke', label: 'Lucas' },
    { value: 'John', label: 'João' },
    { value: 'Acts', label: 'Atos' },
    { value: 'Romans', label: 'Romanos' },
    { value: '1 Corinthians', label: '1 Coríntios' },
    { value: '2 Corinthians', label: '2 Coríntios' },
    { value: 'Galatians', label: 'Gálatas' },
    { value: 'Ephesians', label: 'Efésios' },
    { value: 'Philippians', label: 'Filipenses' },
    { value: 'Colossians', label: 'Colossenses' },
    { value: '1 Thessalonians', label: '1 Tessalonicenses' },
    { value: '2 Thessalonians', label: '2 Tessalonicenses' },
    { value: '1 Timothy', label: '1 Timóteo' },
    { value: '2 Timothy', label: '2 Timóteo' },
    { value: 'Titus', label: 'Tito' },
    { value: 'Philemon', label: 'Filemom' },
    { value: 'Hebrews', label: 'Hebreus' },
    { value: 'James', label: 'Tiago' },
    { value: '1 Peter', label: '1 Pedro' },
    { value: '2 Peter', label: '2 Pedro' },
    { value: '1 John', label: '1 João' },
    { value: '2 John', label: '2 João' },
    { value: '3 John', label: '3 João' },
    { value: 'Jude', label: 'Judas' },
    { value: 'Revelation', label: 'Apocalipse' },
];
