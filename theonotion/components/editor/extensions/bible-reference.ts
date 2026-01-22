import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bibleReference: {
            /**
             * Insert bible text for the reference at the cursor or selection
             */
            insertBibleReference: () => ReturnType,
        }
    }
}

export const BibleReference = Extension.create({
    name: 'bibleReference',

    addCommands() {
        return {
            insertBibleReference: () => ({ state, dispatch, editor }) => {
                const { selection } = state
                const { anchor } = selection

                // This is a naive implementation that grabs the text before the cursor
                // to find a reference pattern. 
                // In a real app, you might want more robust regex or a specific UI.

                // Let's check the last 20 characters
                const textBefore = state.doc.textBetween(Math.max(0, anchor - 20), anchor, '\n')

                // Simple regex for "Book Chapter:Verse" (e.g. John 3:16, João 3:16)
                // Adjust regex for PT-BR names widely
                const regex = /([1-3]?\s?[A-Za-zÀ-ÿ]+)\s(\d+):(\d+)$/
                const match = textBefore.match(regex)

                if (match) {
                    const fullMatch = match[0]
                    const book = match[1]
                    const chapter = match[2]
                    const verse = match[3]

                    // Placeholder for API call
                    const verseText = `[${book} ${chapter}:${verse}] "Porque Deus amou o mundo de tal maneira..." (Texto Exemplo)`

                    // Replace the reference with the full text or append it
                    // For now, let's append it in a blockquote
                    editor.commands.insertContent(`\n<blockquote>${verseText}</blockquote>`)

                    return true
                }

                return false
            },
        }
    },

    addKeyboardShortcuts() {
        return {
            'Mod-b': () => this.editor.commands.insertBibleReference(),
        }
    },
})
