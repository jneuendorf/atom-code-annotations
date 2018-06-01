'use babel'

import path from 'path'
import {File} from 'atom'
import cson from 'season'

import {ANNOTATIONS_DB_FILENAME} from './constants'
import {partition} from './utils'


/*
 * Represents a .annotations.cson file.
 * All changes on an instance of this class are written to that file.
 * Thus they are always in sync (assuming no other source changes the file).
 */
export default class AnnotationsDb {
    static _instances = []

    constructor(projectDir) {
        this.projectDir = projectDir
        const filePath = path.join(
            projectDir.getPath(),
            ANNOTATIONS_DB_FILENAME
        )
        this.annotations = {}
        this.file = new File(filePath)

        AnnotationsDb._instances.push(this)
    }

    // Creates an instance for an existing DB file.
    static async new(projectDir) {
        const instance = new AnnotationsDb(projectDir)
        await instance.readAnnotations()
        return instance
    }

    // Creates a new DB file and returns the according instance.
    static async create(projectDir) {
        const instance = new AnnotationsDb(projectDir)
        const fileWasCreated = await instance.file.create()
        if (!fileWasCreated) {
            throw new Error(
                `AnnotationsDb.create was called for a project that already `
                + `contains annotations.`
            )
        }
        return instance
    }

    static getAll() {
        return this._instances
    }

    static destroyAll() {
        this._instances = []
    }

    // Returns a Promise if 'createIfNeeded' option is 'true'
    static async getInstance(editor, {bound=true, createIfNeeded=false}={}) {
        const editorPath = editor.getPath()
        const instance = this.getInstanceForPath(editorPath)
        if (instance) {
            return (
                bound
                ? new BoundAnnotationsDb(editor, instance)
                : instance
            )
        }
        if (createIfNeeded) {
            const projectDir = (
                atom.project.getDirectories()
                .find(dir => dir.contains(editorPath))
            )
            const annotationsDb = await AnnotationsDb.create(projectDir)
            return (
                bound
                ? new BoundAnnotationsDb(editor, annotationsDb)
                : annotationsDb
            )
        }
        else {
            return null
        }
    }

    static getInstanceForPath(editorPath, {boundTo=null}={}) {
        for (const annotationsDb of this._instances) {
            if (annotationsDb.getProjectDir().contains(editorPath)) {
                return (
                    boundTo
                    ? new BoundAnnotationsDb(boundTo, annotationsDb)
                    : annotationsDb
                )
            }
        }
        return null
    }

    static async getAnnotations(editor, lineNumber=null) {
        const instance = await this.getInstance(editor)
        if (instance) {
            return instance.getAnnotations(lineNumber)
        }
        return []
    }

    static async delete(editor, annotationsToDelete) {
        const instance = await this.getInstance(editor)
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
                    this.annotations = annotations
                    resolve(annotations)
                }
            })
        })
    }

    // TODO: call this method!
    // Destructor. Invoked when 'atom.project.getDirectories()' changes.
    // Use 'atom.project.onDidChangePaths(projectPaths => {})' for listening.
    destroy() {
        AnnotationsDb._instances = AnnotationsDb._instances.filter(
            instance => instance !== this
        )
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

    add(editor, annotations) {
        return this._setAnnotations(
            editor,
            [...this.getAnnotations(editor), ...annotations]
        )
    }

    delete(editor, annotationsToDelete) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(annotation =>
            annotationsToDelete.every(annotationToDelete =>
                !AnnotationsDb.annotationsEqual([annotation, annotationToDelete])
            )
        )
        return this._setAnnotations(editor, annotationsToKeep)
    }

    deleteOnLine(editor, lineNumber) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(
            annotation => annotation.lineNumber !== lineNumber
        )
        return this._setAnnotations(editor, annotationsToKeep)
    }

    deleteAt(editor, lineNumber, index) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationToDelete = annotationsForEditor.filter(
            annotation => annotation.lineNumber === lineNumber
        )[index]
        return this.delete(editor, [annotationToDelete])
    }

    async deleteAll(editorPath) {
        const relativePath = this._relativeEditorPathFromAbsolute(editorPath)
        const removedAnnotations = this.annotations[relativePath]
        delete this.annotations[relativePath]
        await this.persist()
        return removedAnnotations
    }

    // Updates .lineNumber of all annotations on line 'fromLine'.
    updateLineNumber(editor, fromLine, toLine) {
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

    update(editor, annotations) {
        return this._setAnnotations(editor, annotations)
    }

    // (Partly) updates the annotation at `index` with all given props.
    // @param editor
    // @param lineNumber {Number}
    // @param index {Number} Indicates that the i-th annotation on
    //        line 'lineNumber' should be updated.
    // @param props {props}
    updateAt(editor, lineNumber, index, props) {
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

    _setAnnotations(editor, annotations) {
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
        return this._relativeEditorPathFromAbsolute(editorPath)
    }

    _relativeEditorPathFromAbsolute(editorPath) {
        if (this.getProjectDir().contains(editorPath)) {
            return path.relative(this.getProjectPath(), editorPath)
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

    add(annotations) {
        return this.annotationsDb.add(this.editor, annotations)
    }

    delete(annotationsToDelete) {
        return this.annotationsDb.delete(this.editor, annotationsToDelete)
    }

    deleteOnLine(lineNumber) {
        return this.annotationsDb.deleteOnLine(this.editor, lineNumber)
    }

    deleteAt(lineNumber, index) {
        return this.annotationsDb.deleteAt(this.editor, lineNumber, index)
    }

    updateLineNumber(fromLine, toLine) {
        return this.annotationsDb.updateLineNumber(this.editor, fromLine, toLine)
    }

    update(annotations) {
        return this.annotationsDb.update(this.editor, annotations)
    }

    updateAt(lineNumber, index, props) {
        return this.annotationsDb.updateAt(this.editor, lineNumber, index, props)
    }

    _setAnnotations(annotations) {
        return this.annotationsDb._setAnnotations(this.editor, annotations)
    }

    _relativeEditorPath() {
        return this.annotationsDb._relativeEditorPath(this.editor)
    }
}
