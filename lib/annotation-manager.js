'use babel'
import fs from 'fs'
import path from 'path'
import {
    CompositeDisposable,
    TextEditor,
} from 'atom'
import groupBy from 'lodash.groupby'

import CodeAnnotations from './constants'
import Config from './config'
import * as Utils from './utils'
import AnnotationsDb from './annotations-db'
import Annotation from './annotation'
import Renderers from './asset-renderers'
import ShowAllView from './views/show-all-view'
import ShowCommandsView from './views/show-commands-view'
import CodeAnnotationContainer from './views/annotation-container'
import Dialog from './views/dialog'
import {ValueError, AbortError} from './errors'


export default class AnnotationManager {
    static config = Config.configData

    // INSTANCE PROPERTIES
    // commands:                 Object(String, Function)
    // subscriptions:            CompositeDisposable
    // loadedRendererClasses:    Array of AssetRenderer
    // initializedEditors:       Object(String, TextEditor
    // codeAnnotationContainer:  CodeAnnotationContainer

    // showAllView               ShowAllView

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (ATOM API)
    static activate(state) {
        // TODO: this is weird:
        // those are set in the constructor of the CodeAnnotationContainer
        this.textColor = null
        this.backgroundColor = null
        this.commands = null
        this.subscriptions = new CompositeDisposable()
        this.loadedRendererClasses = []
        this.initializedEditors = new Map()
        this.codeAnnotationContainer = new CodeAnnotationContainer(this)
        this.showAllView = new ShowAllView()
        this.showCommandsView = new ShowCommandsView()

        this._init()
    }

    static deactivate() {
        this.subscriptions.dispose()
        this.codeAnnotationContainer.destroy()
        this._destroyGutters()
    }

    // TODO: use serialize to serialize all AnnotationsDbs for a faster startup
    //       time. The actual files can be read in the background after the
    //       package was loaded and activated.
    //       That way disk IO can be postponed.

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (services)

    // API method for plugin packages to register their own renderers for file types
    // TODO: could return asset manager data for better performance
    //       after git pull the passed data could then be invalid
    //       -> user must have the possibility to manually reload the asset files
    static registerRendererClass(rendererClass) {
        const adjustedRendererClass = Renderers.AssetRenderer.ensureSameApi(rendererClass)
        if (adjustedRendererClass == null) {
            throw new Error(
                `Invalid asset renderer '${rendererClass.getName()}'. `
                + 'Expected a subclass of AssetRenderer or a class that has an equivalent API.'
            )
        }
        this.loadedRendererClasses.push(adjustedRendererClass)
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (associated with commands)

    // This method takes care of some things before an addition is added:
    // - Initialize the project directory if necessary.
    // - Ask for the title of the annotation to add.
    // - Replace one or more similar annotations if required.
    static async addAnnotation(row) {
        const editor = atom.workspace.getActiveTextEditor()
        let annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
        if (!annotationsDb) {
            // TODO: init directory + editor
            annotationsDb = null
        }

        const titleDialog = new Dialog({
            prompt: 'Enter the title!',
            iconClass: 'tag',
            attach: true,
            handleConfirm: input => {
                if (input.length > 0) {
                    return input
                }
                throw new ValueError('Annotation title must not be empty!')
            }
        })
        const title = await titleDialog.awaitConfirm()

        const guessedLineNumber = row + 1
        const lineNumberDialog = new Dialog({
            prompt: 'Enter the line number!',
            iconClass: 'pencil',
            initialText: guessedLineNumber,
            select: true,
            attach: true,
            handleConfirm: input => {
                const n = parseInt(input, 10)
                if (!isNaN(n) && n >= 0) {
                    return n
                }
                throw new ValueError('Enter a valid line number!')
            }
        })
        const lineNumber = await lineNumberDialog.awaitConfirm()

        const possibleTypes = (
            Object.entries(Renderers)
            .map(([name, {type}]) => type)
        )
        const typeDialog = new Dialog({
            prompt: (
                'Choose the annotation type! Possible values: '
                + possibleTypes.join(', ')
            ),
            iconClass: 'paintcan',
            initialText: 'html',
            select: true,
            attach: true,
            handleConfirm: input => {
                input = input.toLowerCase()
                if (possibleTypes.indexOf(input) >= 0) {
                    return input
                }
                throw new ValueError('Enter a valid annotation type!')
            }
        })
        const type = await typeDialog.awaitConfirm()
        let content
        try {
            content = await this._getAnnotationContent(type, title)
        }
        catch (error) {
            if (error instanceof AbortError) {
                atom.notifications.addInfo(
                    'Annotation was not created. '
                    + 'No annotations were deleted.'
                )
            }
            else {
                throw error
            }
        }

        const rawAnnotations = annotationsDb.getAnnotations(editor)
        const similarRawAnnotations = (
            rawAnnotations
            .filter(({title: otherTitle, lineNumber: otherLineNumber}) =>
                otherTitle.toLowerCase() === title.toLowerCase()
                && otherLineNumber === lineNumber
            )
        )

        const numSimilar = similarRawAnnotations.length
        if (numSimilar > 0) {
            if (Config.showReplaceConfirmDialog) {
                const message = CodeAnnotations.REPLACE_CONFIRM_MESSAGE(
                    similarRawAnnotations
                )
                const replace = atom.confirm({
                    message,
                    Replace: () => true,
                    Cancel: () => false,
                })
                if (replace) {
                    annotationsDb.delete(
                        editor,
                        similarRawAnnotations,
                    )
                }
            }
        }

        // TODO: Restore deleted annotations upon error (in finally block).
        annotationsDb.add(editor, {
            lineNumber,
            title,
            content,
            type,
        })
        // Either add an icon to the gutter or update the list of annotations
        // associated with an icon (if the new annotation is on the same line
        // as others).
        if (this.initializedEditors.has(editor)) {
            // TODO: make this smarter if UX sucks
            this._reinitializeEditor(editor)
        }
        // The annotation was already added to the DB thus it will be displayed
        // after initialization.
        else {
            this._initEditor(editor)
        }
    }

    static async _getAnnotationContent(type, title) {
        return new Promise((resolve, reject) => {
            try {
                const rendererClass = Renderers.byType[type]
                if (rendererClass.isBinary) {
                    const paths = Utils.chooseFile('Now, choose a file!')
                    if (!paths || paths.length === 0) {
                        reject(new AbortError('No file chosen.'))
                    }
                    resolve(Utils.readFileBase64(paths[0]))
                }
                else {
                    Utils.createAndOpenTmpFile(
                        `${title}.${type === 'html' ? 'html' : 'txt'}`
                    ).then(editor => {
                        const editorPath = editor.getPath()
                        editor.onDidSave(() =>
                            resolve(
                                fs.readFileSync(editorPath, {encoding: 'utf8'})
                            )
                        )
                        editor.onDidDestroy(() => {
                            fs.unlinkSync(editorPath)
                            reject(
                                new AbortError('Editor was closed without saving.')
                            )
                        })
                    })
                }
            }
            catch (error) {
                reject(error)
            }
        })
    }

    static deleteAnnotations(points) {
        const editor = atom.workspace.getActiveTextEditor()
        const annotations = (
            points
            .map(point => this._getCodeAnnotationsAtPoint(editor, point))
            // flatten
            .reduce(
                (acc, annotations) => acc.concat(annotations),
                []
            )
        )
        if (annotations.length === 0) {
            atom.notifications.addInfo('There no code annotation at any of the current cursor positions.')
            return
        }
        const message = CodeAnnotations.DELETE_CONFIRM_MESSAGE
        if (Config.showDeleteConfirmDialog && !Utils.confirm({message})) {
            return
        }

        for (const annotation of annotations) {
            annotation.delete()
        }
    }

    static showAll() {
        this.showAllView.show(this.getAllCodeAnnotations())
    }

    static showCommands() {
        this.showCommandsView.show(['code-annotations:show-commands'])
    }

    static reload() {
        this.deactivate()
        this.activate(this.serialize)
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC

    // grouped by editor paths
    static getAllCodeAnnotations() {
        const annotations = {}
        for (const [editorPath, editorData] of this.initializedEditors.entries()) {
            annotations[editorPath] = editorData.annotations
        }
        return annotations
    }

    // TODO: use react
    static showContainer(annotations) {
        this.codeAnnotationContainer.update(annotations)
        this.codeAnnotationContainer.show()
    }

    static hideContainer() {
        this.codeAnnotationContainer.hide()
    }

    static loadEditor(editor) {
        // This happens for e.g. the settings view.
        if (!editor) {
            return
        }

        if (!this.initializedEditors.has(editor)) {
            try {
                this._initEditor(editor)
            }
            catch (error) {
                // NOTE: Must not throw error here because otherwise a potential
                //       editor switch would be interrupted
                //       (see _init -> observeActivePaneItem).
                console.error(`Error while initializing the editor with path '${editor.getPath()}'.`)
                console.error(error)
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE
    static _init() {
        this._registerCommands()

        try {
            this._registerElements()
        }
        catch (error) {
            if (atom.inDevMode()) {
                console.info('code-annotations\' custom DOM elements are already registered.')
            }
        }

        this._loadAnnotationsDbs(
            atom.project.getDirectories()
            .filter(dir => dir.getFile(CodeAnnotations.ANNOTATIONS_FILENAME).existsSync())
        )

        this._registerRenderers()

        if (!Config.manuallyLoadCodeAnnotations) {
            this.loadEditor(atom.workspace.getActiveTextEditor())
            atom.workspace.observeActivePaneItem(editor => {
                this.codeAnnotationContainer.hide()
                if (editor instanceof TextEditor) {
                    this.loadEditor(editor)
                }
            })
        }
    }

    // this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    // TODO: Annotation instances have a reference to rawAnnotations but those may change over time
    //       causing the reference to become invalid. Maybe redux can be used...
    static _initEditor(editor) {
        // TODO: migrate data if directory exists!
        //       Or better: add a command for manually migrating stuff.
        //       This makes the implementation easier.
        const rawAnnotations = AnnotationsDb.getAnnotations(editor)
        console.log('in _initEditor...', path.basename(editor.getPath()))

        // no annotations => nothing to initialize
        if (rawAnnotations.length === 0) {
            return
        }

        const rawAnnotationsByLine = groupBy(rawAnnotations, 'lineNumber')
        const gutter = editor.addGutter({
            name: CodeAnnotations.GUTTER_NAME,
            priority: Config.gutterPriority,
            visible: true,
        })

        // const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
        const annotations = []
        for (const [lineNumberStr, rawAnnotations] of Object.entries(rawAnnotationsByLine)) {
            // TODO: This must become a separate method with a dynamic lookup
            //       for annotation on a line if adding an annotation does NOT
            //       cause reinitializing the editor!

            // It's nicer to store 1-based line number in '.annotations.cson'
            // for manual editing.
            const lineNumber = parseInt(lineNumberStr, 10) - 1
            const indentation = editor.indentationForBufferRow(lineNumber)
            const lineText = editor.lineTextForBufferRow(lineNumber)
            // [row, column]
            const range = [
                [lineNumber, indentation],
                [lineNumber, lineText.length - 1]
            ]
            const marker = this._createAnnotationMarker(editor, range)

            const annotationInstances = (
                rawAnnotations
                .map(rawAnnotation =>
                    new Annotation(this, {
                        editor,
                        marker,
                        rawAnnotation,
                    })
                )
            )

            // TODO: use setting here for custom icon.
            //       see https://flight-manual.atom.io/hacking-atom/sections/iconography/
            const gutterIcon = document.createElement('code-annotation-gutter-icon')
            gutter.decorateMarker(marker, {item: gutterIcon})
            gutterIcon.addEventListener('click', event => {
                // TODO dynamic!
                this.showContainer(annotationInstances)
            })

            annotations.push(...annotationInstances)
        }
        console.log('initialized', editor.getPath(), annotations)

        // Support renaming open editors' files.
        // Changing unopen files won't be listened to.
        let editorPath = editor.getPath()
        this.subscriptions.add(editor.onDidChangePath(() => {
            this._onDidChangeEditorPath(editor, editorPath)
            editorPath = editor.getPath()
        }))

        this.subscriptions.add(editor.onDidDestroy(() =>
            this.initializedEditors.delete(editor.getPath())
        ))

        this.initializedEditors.set(editor, {
            annotations,
            gutter,
        })
    }

    static _uninitEditor(editor) {
        const editorData = this.initializedEditors.get(editor)
        if (editorData != null) {
            for (const annotation of editorData.annotations) {
                annotation.destroy()
            }
            Utils.getGutterWithName(editor, CodeAnnotations.GUTTER_NAME).destroy()
            this.initializedEditors.delete(editor)
        }
        else {
            if (atom.inDevMode()) {
                console.warn(
                    '`_uninitEditor` should not be called for uninitialized editors'
                )
            }
        }
    }

    static _reinitializeEditor(editor) {
        this._uninitEditor(editor)
        this._initEditor(editor)
    }

    static _registerRenderers() {
        for (const name in Config.configData.renderers.properties) {
            if (Config[name] === true) {
                this.registerRendererClass(Renderers[name.replace('load', '')])
            }
        }
    }

    // get the name of the annotation at the given point
    static _getCodeAnnotationsAtPoint(editor, point) {
        return (
            this.initializedEditors.get(editor)
            .annotationInstances
            .filter(annotation =>
                annotation.marker.getBufferRange().start.row === point.row
            )
        )
    }

    // takes care of removing the unnecessary stuff (i.e. dom nodes)
    // i guess all refs to this singleton are also disposed so everything else will be cleared from memory as well
    static _destroyGutters() {
        for (const editor of this.initializedEditors.keys()) {
            const gutter = Utils.getGutterWithName(
                editor,
                CodeAnnotations.GUTTER_NAME,
            )
            gutter.destroy()
        }
    }

    // The created instances of AnnotationsDb can be retrieved with
    // AnnotationsDb.getInstanceForEditor().
    static _loadAnnotationsDbs(projectDirectoriesWithAnnotations) {
        for (const projectDir of projectDirectoriesWithAnnotations) {
            new AnnotationsDb(projectDir)
        }
    }

    // TODO: _reinitializeEditor should always be sufficient.
    //       Except when '.annotations.cson' has to be created.
    static _onDidChangeEditorPath(editor, oldEditorPath) {
        let newAssetManager = AnnotationsDb.getInstanceForEditor(editor)
        // TextEditor has been moved into another project folder that has no
        // '.annotations.cson' file (thus is uninitialized).
        if (!newAssetManager) {
            // TODO: implement this
            this._initProjectDirectory()
            // newAssetManager = ...
        }

        const {
            assetManager: oldAssetManager,
        } = this.initializedEditors.get(oldEditorPath)
        // const newEditorPath = editor.getPath()
        // TextEditor has been moved within the same project folder.
        if (newAssetManager === oldAssetManager) {
            this.initializedEditors.delete(editor)
            // delete this.initializedEditors.get(oldEditorPath)
            // this.initializedEditors.get(newEditorPath) = {
            //     ...this.initializedEditors.get(oldEditorPath),
            //     assetManager: newAssetManager,
            // }
        }
        // TextEditor has been moved into another project folder.
        else {
            oldAssetManager.move(newAssetManager)
        }
        this._reinitializeEditor(editor)
    }

    static _registerCommands() {
        this.commands = {
            'code-annotations:add-annotation': () => {
                const cursors = (
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPositions()
                )
                if (cursors.length === 1) {
                    this.addAnnotation(cursors[0].row)
                }
                else {
                    atom.notifications.addInfo(
                        'Adding an annotation to multiple cursors is not supported.'
                    )
                }
            },
            'code-annotations:delete-annotations': () =>
                this.deleteAnnotations(
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPositions()
                ),
            'code-annotations:show-all': () =>
                this.showAll(),
            'code-annotations:show-commands': () =>
                this.showCommands(),
            'code-annotations:reload': () =>
                this.reload(),
            'code-annotations:load-current-editor': () =>
                this.loadEditor(atom.workspace.getActiveTextEditor()),
            'code-annotations:hide-container': event => {
                // make the event continue bubble upward
                event.abortKeyBinding()
                this.hideContainer()
            }
        }
        this.subscriptions.add(atom.commands.add('atom-workspace', this.commands))
    }

    static _registerElements() {
        document.registerElement('code-annotation', {
            prototype: Object.create(HTMLDivElement.prototype),
            extends: 'div'
        })
        document.registerElement('code-annotation-gutter-icon', {
            prototype: Object.create(HTMLDivElement.prototype),
            extends: 'div'
        })
        document.registerElement('code-annotation-container', {
            prototype: Object.create(HTMLDivElement.prototype),
            extends: 'div'
        })
        return this
    }

    static _createAnnotationMarker(editor, range) {
        const marker = editor.markBufferRange(range, {invalidate: 'never'})
        // // update AnnotationsDb
        // TODO: update other editor instances (i.e. when using split pane)
        marker.onDidChange(event => {
            const {
                oldHeadBufferPosition: {row: oldRow},
                newHeadBufferPosition: {row: newRow},
            } = event
            if (oldRow !== newRow) {
                const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
                annotationsDb.move(editor, oldRow + 1, newRow + 1)
            }
        })

        // Delete annotations on the marker's line.
        marker.onDidDestroy(() => {
            const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
            const {row} = marker.getHeadBufferPosition()
            annotationsDb.deleteOnLine(editor, row + 1)
        })

        // marker.setProperties({
        //     originalText: editor.getTextInBufferRange(range).trim()
        // })
        //
        // this.subscriptions.add(marker.onDidChange(event => {
        //     const properties = marker.getProperties()
        //     if (event.textChanged) {
        //         const currentRange = marker.getBufferRange()
        //         const markerText = editor.getTextInBufferRange(currentRange).trim()
        //         const {annotation} = properties
        //         if (markerText.length > 0) {
        //             // non-whitespace text changes => custom invalidate
        //             if (properties.originalText !== markerText) {
        //                 annotation.invalidate()
        //             }
        //             else {
        //                 // changed text back to oringal => it's valid again
        //                 annotation.validate()
        //             }
        //         }
        //         else {
        //             const editorData = this.initializedEditors[editor.getPath()]
        //             editorData.annotations = editorData.annotations.filter(
        //                 a => a !== annotation
        //             )
        //             if (Config.showDeleteConfirmDialog && Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
        //                 annotation.delete(false)
        //             }
        //             else {
        //                 annotation.destroy()
        //             }
        //         }
        //     }
        // }))
        return marker
    }
}
