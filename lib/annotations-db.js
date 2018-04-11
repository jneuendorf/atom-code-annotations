'use babel'

import cson from 'season'
// import fs from 'fs-plus'
import path from 'path'

import Annotation from './annotation'
import Constants from './constants'
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
        this.filePath = path.join(
            projectDir.getPath(),
            Constants.ANNOTATIONS_DB_FILENAME
        )
        this.annotations = cson.readFileSync(this.filePath)

        AnnotationsDb._instances.push(this)
        console.log('created annotationsDb', this)
    }

    static getAll() {
        return [...this._instances]
    }

    static getInstanceForEditor(editor) {
        if (atom.workspace.isTextEditor(editor)) {
            const editorPath = editor.getPath()
            for (const annotationsDb of this._instances) {
                // console.log('trying db',  annotationsDb, 'for', editorPath)
                if (annotationsDb.getProjectDir().contains(editorPath)) {
                    return annotationsDb
                }
            }
        }
        return null
    }

    static getAnnotations(editor, lineNumber=null) {
        const instance = this.getInstanceForEditor(editor)
        if (instance) {
            return instance.getAnnotations(editor, lineNumber)
        }
        return []
    }

    static delete(editor, annotationsToDelete) {
        const instance = this.getInstanceForEditor(editor)
        if (instance) {
            instance.delete(editor, annotationsToDelete)
        }
    }

    // TODO: call this method!
    // Destructor. Invoked when 'atom.project.getDirectories()' changes.
    // Use 'atom.project.onDidChangeFiles(events => {})' for listening.
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

    getFilePath() {
        return this.filePath
    }

    // Writes the current state to the file.
    persist() {
        cson.writeFileSync(this.getFilePath(), this.annotations)
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

    add(editor, annotation) {
        this._setAnnotations(
            editor,
            [...this.getAnnotations(editor), annotation]
        )
    }

    delete(editor, annotationsToDelete) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(annotation =>
            annotationsToDelete.every(annotationToDelete =>
                !Annotation.equal([annotation, annotationToDelete])
            )
        )
        this._setAnnotations(editor, annotationsToKeep)
    }

    deleteOnLine(editor, lineNumber) {
        const annotationsForEditor = this.getAnnotations(editor)
        const annotationsToKeep = annotationsForEditor.filter(
            annotation => annotation.lineNumber !== lineNumber
        )
        this._setAnnotations(editor, annotationsToKeep)
    }

    // Updates .lineNumber of all annotations on line 'fromLine'.
    updateLineNumber(editor, fromLine, toLine) {
        const annotations = this.getAnnotations(editor, fromLine)
        this._setAnnotations(
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
        this._setAnnotations(editor, annotations)
    }

    // (Partly) updates the annotation at `index` with all given props.
    // @param editor
    // @param lineNumber {Number}
    // @param index {Number} Indicates that the i-th annotation on
    //        line 'lineNumber' should be updated.
    // @param props {props}
    updateAt(editor, lineNumber, index, props) {
        const annotations = this.getAnnotations(editor)
        const [annotationsOnLine, rest] = partition(annotations, annotation =>
            annotation.lineNumber === lineNumber
        )
        this.update(
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
        this.annotations[relativePath] = annotations
        this.persist()
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
        // const editorPath = path.normalize(editor.getPath())
        // const projectPath = this.getProjectPath()
        // for (const relAnnotatedFilePath in this.annotations) {
        //     const absAnnotatedFilePath = path.normalize(
        //         path.join(projectPath, relAnnotatedFilePath)
        //     )
        //     // <=> if paths are equal
        //     if (path.relative(editorPath, absAnnotatedFilePath) === '') {
        //         return relAnnotatedFilePath
        //     }
        // }
        // return null
    }
}
