'use babel'

import {File} from 'atom'
import cson from 'season'
import path from 'path'

import {ANNOTATIONS_DB_FILENAME} from './constants'
import {partition} from './utils'
import {defaultLogger as logger} from './logging'

/*
 * Represents a .annotations.cson file.
 * All changes on an instance of this class are written to that file.
 * Thus they are always in sync (assuming no other source changes the file).
 */
export default class AnnotationsDb {
    static _instances = []

    constructor(projectDir, notify) {
        this.projectDir = projectDir
        const filePath = path.join(
            projectDir.getPath(),
            ANNOTATIONS_DB_FILENAME
        )
        this.annotations = []

        this.file = new File(filePath)
        logger.log('watching', filePath)
        // TODO: notify only when edited manually?
        this.unwatchFile = this.file.onDidChange(() => {
            cson.readFile(filePath, (error, object) => {
                this.annotations = object
                notify(Object.keys(this.annotations))
            })
        })
        // this.file.onWillThrowWatchError(({error, handle}) => {
        //
        // })
        AnnotationsDb._instances.push(this)
    }

    static async new(projectDir, notify) {
        const instance = new AnnotationsDb(projectDir, notify)
        await instance.readAnnotations()
        return instance
    }

    static getAll() {
        return [...this._instances]
    }

    static getInstanceForEditor(editor, {bound=true}={}) {
        if (atom.workspace.isTextEditor(editor)) {
            const editorPath = editor.getPath()
            for (const annotationsDb of this._instances) {
                // console.log('trying db',  annotationsDb, 'for', editorPath)
                if (annotationsDb.getProjectDir().contains(editorPath)) {
                    return bound ? new BoundAnnotationsDb(editor, annotationsDb) : annotationsDb
                }
            }
        }
        return null
    }

    static getAnnotations(editor, lineNumber=null) {
        const instance = this.getInstanceForEditor(editor)
        if (instance) {
            return instance.getAnnotations(lineNumber)
        }
        return []
    }

    static delete(editor, annotationsToDelete) {
        const instance = this.getInstanceForEditor(editor)
        if (instance) {
            instance.delete(annotationsToDelete)
        }
    }

    static annotationsEqual(annotations, {regardLineNumber=true}={}) {
        const [first, ...rest] = annotations
        return rest.reduce(
            (acc, annotation) => acc && this._annotationsEqual(first, annotation),
            true
        )
    }

    static _annotationsEqual(a, b, regardLineNumber=false) {
        return (
            a.title === b.title
            && a.content === b.content
            && a.type === b.type
            && (
                regardLineNumber
                ? a.lineNumber === b.lineNumber
                : true
            )
        )
    }


    readAnnotations() {
        return new Promise((resolve, reject) => {
            cson.readFile(this.file.getPath(), (error, annotations) => {
                if (error) {
                    reject(error)
                }
                else {
                    resolve(annotations)
                }
                this.annotations = annotations
            })
        })
        // this.annotations = cson.readFileSync(this.file.getPath())
    }

    // TODO: call this method!
    // Destructor. Invoked when 'atom.project.getDirectories()' changes.
    // Use 'atom.project.onDidChangeFiles(events => {})' for listening.
    destroy() {
        AnnotationsDb._instances = AnnotationsDb._instances.filter(
            instance => instance !== this
        )
        this.unwatchFile()
    }

    getProjectDir() {
        return this.projectDir
    }

    getProjectPath() {
        return this.getProjectDir().getPath()
    }

    // Writes the current state to the file.
    persist() {
        return new Promise((resolve, reject) => {
            cson.writeFile(this.file.getPath(), this.annotations, error => {
                if (error) {
                    reject(error)
                }
                else {
                    resolve()
                }
            })
        })
    }

    // Returns a new array instance containing the annotation objects
    // optionally filtered by line number.
    getAnnotations(editor, lineNumber=null) {
        const relativePath = this._relativeEditorPath(editor)
        if (relativePath in this.annotations) {
            if (lineNumber == null) {
                return [...this.annotations[relativePath]]
            }
            else {
                return this.annotations[relativePath].filter(
                    annotation => annotation.lineNumber === lineNumber
                )
            }
        }
        // Filtering is unnecessary in this case.
        else {
            return []
        }
    }

    async add(editor, annotation) {
        return this._setAnnotations(
            editor,
            [...this.getAnnotations(editor), annotation]
        )
    }

    async delete(editor, annotationsToDelete) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(annotation =>
            annotationsToDelete.every(annotationToDelete =>
                !AnnotationsDb.annotationsEqual([annotation, annotationToDelete])
            )
        )
        return this._setAnnotations(editor, annotationsToKeep)
    }

    async deleteOnLine(editor, lineNumber) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(
            annotation => annotation.lineNumber !== lineNumber
        )
        return this._setAnnotations(editor, annotationsToKeep)
    }

    async deleteAt(editor, lineNumber, index) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationToDelete = annotationsForEditor.filter(
            annotation => annotation.lineNumber === lineNumber
        )[index]
        return this.delete(editor, [annotationToDelete])
    }

    // Updates .lineNumber of all annotations on line 'fromLine'.
    async updateLineNumber(editor, fromLine, toLine) {
        const annotations = this.getAnnotations(editor, fromLine)
        return this._setAnnotations(
            editor,
            annotations.map(annotation => {
                return {
                    ...annotation,
                    lineNumber: toLine,
                }
            })
        )
    }

    async update(editor, annotations) {
        return this._setAnnotations(editor, annotations)
    }

    // (Partly) updates the annotation at `index` with all given props.
    // @param editor
    // @param lineNumber {Number}
    // @param index {Number} Indicates that the i-th annotation on
    //        line 'lineNumber' should be updated.
    // @param props {props}
    async updateAt(editor, lineNumber, index, props) {
        const annotations = this.getAnnotations(editor)
        const [annotationsOnLine, rest] = partition(
            annotations,
            annotation => annotation.lineNumber === lineNumber
        )
        return this.update(
            editor,
            [
                ...annotationsOnLine.map((annotation, i) =>
                    i === index ? {...annotation, ...props} : annotation
                ),
                ...rest
            ]
        )
    }

    async _setAnnotations(editor, annotations) {
        const relativePath = this._relativeEditorPath(editor)
        if (annotations.length > 0) {
            this.annotations[relativePath] = annotations
        }
        else {
            delete this.annotations[relativePath]
        }
        return this.persist()
    }

    _relativeEditorPath(editor) {
        const editorPath = editor.getPath()
        if (this.getProjectDir().contains(editorPath)) {
            return path.normalize(
                path.relative(this.getProjectPath(), editorPath)
            )
        }
        else {
            throw new Error(
                'Editor does not belong to this AnnotationsDb instance.'
            )
        }
    }
}

// A convenience class that is bound to a TextEditor instance.
// This way the 'editor' argument required for most AnnotationsDb's methods
// does not have to be passed all the time.
// This could be accomplished with the 'Proxy' class but that can be tricky when
// debugging.
export class BoundAnnotationsDb {
    constructor(editor, annotationsDb) {
        this.editor = editor
        this.annotationsDb = annotationsDb
    }

    getAnnotations(lineNumber=null) {
        return this.annotationsDb.getAnnotations(this.editor, lineNumber)
    }

    async add(annotation) {
        return this.annotationsDb.add(this.editor, annotation)
    }

    async delete(annotationsToDelete) {
        return this.annotationsDb.delete(this.editor, annotationsToDelete)
    }

    async deleteOnLine(lineNumber) {
        return this.annotationsDb.deleteOnLine(this.editor, lineNumber)
    }

    async deleteAt(lineNumber, index) {
        return this.annotationsDb.deleteAt(this.editor, lineNumber, index)
    }

    async updateLineNumber(fromLine, toLine) {
        return this.annotationsDb.updateLineNumber(this.editor, fromLine, toLine)
    }

    async update(annotations) {
        return this.annotationsDb.update(this.editor, annotations)
    }

    async updateAt(lineNumber, index, props) {
        return this.annotationsDb.updateAt(this.editor, lineNumber, index, props)
    }

    async _setAnnotations(annotations) {
        return this.annotationsDb._setAnnotations(this.editor, annotations)
    }

    _relativeEditorPath() {
        return this.annotationsDb._relativeEditorPath(this.editor)
    }
}
