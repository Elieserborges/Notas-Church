"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { BibleReference } from './editor/extensions/bible-reference'
import { useEffect } from 'react'

interface EditorProps {
    content?: string
    onChange?: (content: string) => void
}

export function Editor({ content = '', onChange }: EditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder: "Digite '/' para comandos ou comece a escrever...",
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:pointer-events-none before:h-0',
            }),
            BibleReference,
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-stone dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6',
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
        immediatelyRender: false,
    })

    // Update content if changed externally
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    if (!editor) {
        return null
    }

    return (
        <div className="w-full max-w-4xl mx-auto mt-6">
            <EditorContent editor={editor} />
        </div>
    )
}
