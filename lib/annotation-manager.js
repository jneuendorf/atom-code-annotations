'use babel'

import 'babel-polyfill'

import path from 'path'
import {
    Disposable,
    CompositeDisposable,
    TextEditor,
} from 'atom'
import ReactDom from 'react-dom'
import React from 'react'
import groupBy from 'lodash.groupby'
import flatten from 'lodash.flattendepth'

import {
    REPLACE_CONFIRM_MESSAGE,
    DELETE_CONFIRM_MESSAGE,
    ANNOTATIONS_DB_FILENAME,
    GUTTER_NAME,
} from './constants'
import * as Config from './config'
import AnnotationsDb from './annotations-db'
import Annotation from './views/annotation'
import RendererRegistry from './renderer-registry'
import Commands from './commands'
import {Server} from './server'
import ShowAllView from './views/show-all-view'
import ShowAnnotationDbsView from './views/show-annotation-dbs-view'
import CodeAnnotationContainer from './views/annotation-container'
import Dialog from './views/dialog'
import {filterAsync, showMessageBox} from './utils'
import {detectMigratables} from './migrate'
import {ValueError, AbortError} from './errors'
import {defaultLogger as logger} from './logging'


export default class AnnotationManager {
    static config = Config.config

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (ATOM API)
    // NOTE: this method may return a promise, see https://git.io/vp9EO
    static activate(state) {
        this.subscriptions = new CompositeDisposable()
        this.editorData = new Map()
        this.showAllView = new ShowAllView()
        this.showAnnotationDbsView = new ShowAnnotationDbsView()

        // Static methods can't be bound like non-static methods.
        this.deleteAnnotation = this.deleteAnnotation.bind(this)
        this.editAnnotation = this.editAnnotation.bind(this)

        this.subscriptions.add(
            atom.commands.add('atom-workspace', Commands.boundTo(this)),
            atom.workspace.observeActivePaneItem(async editor => {
                if (editor instanceof TextEditor) {
                    const basename = path.basename(editor.getPath())
                    if (basename === ANNOTATIONS_DB_FILENAME) {
                        const subscriptions = new CompositeDisposable(
                            editor.onDidSave(event => {
                                this._onDidSaveAnnotationsDb(editor)
                            }),
                            editor.onDidDestroy(() => {
                                subscriptions.dispose()
                            }),
                        )
                    }
                    else {
                        await this.loadEditor(editor)
                    }
                }
            }),
        )

        window.setTimeout(
            async () => {
                RendererRegistry.registerBuiltIns()

                const directories = await filterAsync(
                    atom.project.getDirectories(),
                    dir => dir.getFile(ANNOTATIONS_DB_FILENAME).exists(),
                )
                await this._loadAnnotationsDbs(directories)
                await this.loadEditor(atom.workspace.getActiveTextEditor())

                this.mountPoint = document.createElement('div')
                this.mountPoint.classList.add('code-annotations-mount-point')
                atom.views.getView(atom.workspace).appendChild(this.mountPoint)
                this.container = ReactDom.render(
                   <CodeAnnotationContainer
                       deleteAnnotation={this.deleteAnnotation}
                       editAnnotation={this.editAnnotation}
                   />,
                   this.mountPoint,
                )

                Server.init(this.addAnnotation.bind(this))

                const migratables = await detectMigratables()
                for (const oldDir of migratables) {
                    atom.notifications.addWarning(
                        `The directory '${oldDir.getPath()}' seems to contain `
                        + `code annotations that are not compatible with this `
                        + `version of code-annotations. Run the 'migrate' `
                        + `command (VCS usage recommended).`,
                        {dismissable: true}
                    )
                }
            },
            0
        )
    }

    static deactivate() {
        this.subscriptions.dispose()
        this.showAllView.destroy()
        this.showAnnotationDbsView.destroy()

        // Destroy container.
        ReactDom.unmountComponentAtNode(this.mountPoint)
        this.mountPoint.remove()
        // Destroy gutters and listeners.
        for (const editor of this.initializedEditors) {
            this._uninitEditor(editor)
        }
        AnnotationsDb.destroyAll()
        Server.destroy()
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (services)

    // API method for plugin packages to register their own renderers for file types
    static registerRenderer(rendererClass) {
        RendererRegistry.register(rendererClass)
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (associated with commands)

    static get initializedEditors() {
        return new Set(this.editorData.keys())
    }

    // This method takes care of some things before an addition is added:
    // - Initialize the project directory if necessary.
    // - Ask for the title of the annotation to add.
    // - Replace one or more similar annotations if required.
    // The 'kwargs' may provide some annotation properties (e.g. used by the server).
    static async addAnnotation({title, type, content}={}) {
        const editor = atom.workspace.getActiveTextEditor()
        if (!atom.workspace.isTextEditor(editor)) {
            atom.notifications.addInfo(
                'Annotations can only be added to text editors.'
            )
            return
        }
        const cursors = (
            atom.workspace
            .getActiveTextEditor()
            .getCursorBufferPositions()
        )
        if (cursors.length > 1) {
            atom.notifications.addInfo(
                'Adding an annotation to multiple cursors is not supported.'
            )
            return
        }
        const lineNumber = cursors[0].row + 1
        const annotationsDb = await AnnotationsDb.getInstance(
            editor,
            {createIfNeeded: true},
        )

        if (!title) {
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
            title = await titleDialog.awaitConfirm()
        }

        const possibleTypes = (
            Object.entries(RendererRegistry.getRenderers())
            .map(([name, {type}]) => type)
        )
        if (!type) {
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
            type = await typeDialog.awaitConfirm()
        }
        else {
            if (!possibleTypes.includes(type)) {
                throw new Error(`Invalid annotation type '${type}'.`)
            }
        }

        if (!content) {
            try {
                content = await Annotation.askForContent(type, title)
            }
            catch (error) {
                if (error instanceof AbortError) {
                    atom.notifications.addInfo(
                        'Annotation was not created. '
                        + 'No annotations were deleted.'
                    )
                    return
                }
                else {
                    throw error
                }
            }
        }

        const rawAnnotations = annotationsDb.getAnnotations()
        const similarRawAnnotations = (
            rawAnnotations
            .filter(({title: otherTitle, lineNumber: otherLineNumber}) =>
                otherTitle.toLowerCase() === title.toLowerCase()
                && otherLineNumber === lineNumber
            )
        )

        const numSimilar = similarRawAnnotations.length
        if (numSimilar > 0) {
            if (Config.get('dialogs.showReplaceConfirm')) {
                const message = REPLACE_CONFIRM_MESSAGE(similarRawAnnotations)
                const buttonIndex = await showMessageBox({
                    message,
                    buttons: ['Replace', 'Cancel'],
                })
                if (buttonIndex === 0) {
                    annotationsDb.delete(similarRawAnnotations)
                }
            }
        }

        await annotationsDb.add([{
            lineNumber,
            title,
            content,
            type,
        }])
        // Either add an icon to the gutter or update the list of annotations
        // associated with an icon (if the new annotation is on the same line
        // as others).
        if (this.initializedEditors.has(editor)) {
            const annotations = await AnnotationsDb.getAnnotations(
                editor,
                lineNumber,
            )
            // The new annotation requires a new gutter icon.
            if (annotations.length === 1) {
                this._addGutterIcon(editor, lineNumber)
            }
        }
        // The annotation was already added to the DB thus it will be displayed
        // after initialization.
        else {
            await this._initEditor(editor)
        }
    }

    static async showAll() {
        const annotations = await this.getAllAnnotations()
        const items = annotations.map(annotation => {
            const {projectPath, relativePath, lineNumber, title} = annotation
            return {
                name: title,
                displayName: title,
                rightText: `${relativePath} (line ${lineNumber})`,
                projectPath,
                relativePath,
                lineNumber,
            }
        })
        this.showAllView.show({items})
    }

    static async getAllAnnotations() {
        const editor = atom.workspace.getActiveTextEditor()
        const db = await AnnotationsDb.getInstance(editor, {bound: false})
        if (db) {
            const editorPath = editor.getPath()
            const projectPath = db.getProjectPath()
            return flatten(
                Object.entries(db.annotations)
                .map(([relativePath, annotations]) =>
                    annotations.map(annotation => {
                        return {
                            projectPath,
                            relativePath,
                            ...annotation
                        }
                    })
                )
                // Show current editor's annotations on top.
                .sort(([relativePathA], [relativePathB]) => {
                    if (editorPath.endsWith(relativePathA)) {
                        return -1
                    }
                    else if (editorPath.endsWith(relativePathB)) {
                        return 1
                    }
                    return 0
                })
            )
        }
        else {
            return []
        }
    }

    static showAnnotationDbs() {
        const items = AnnotationsDb.getAll().map(annotationsDb => {
            const projectPath = annotationsDb.getProjectPath()
            return {
                name: projectPath,
                displayName: projectPath,
                projectPath,
            }
        })
        this.showAnnotationDbsView.show({items})
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC

    static showContainer(state) {
        this.container.setState({
            hidden: false,
            selectedIndex: 0,
            ...state,
        })
    }

    static hideContainer() {
        this.container.setState({hidden: true})
    }

    static async deleteAnnotation(editor, lineNumber, index) {
        const annotationsDb = await AnnotationsDb.getInstance(editor)
        await annotationsDb.deleteAt(lineNumber, index)
        const annotations = annotationsDb.getAnnotations(lineNumber)
        if (annotations.length > 0) {
            this.showContainer({annotations})
        }
        else {
            this.hideContainer()
            const correspondingMarker = (
                this.editorData.get(editor).markers
                .filter(marker =>
                    marker.getHeadBufferPosition().row + 1 === lineNumber
                )[0]
            )
            // remove gutter marker + decoration (== gutter icon)
            correspondingMarker.destroy()
        }
    }

    static async editAnnotation(editor, lineNumber, index, newContent) {
        const annotationsDb = await AnnotationsDb.getInstance(editor)
        // There must be a DB instance because we currently show annotations
        // for the active text editor.
        await annotationsDb.updateAt(lineNumber, index, {content: newContent})
    }

    static async loadEditor(editor) {
        // This happens for e.g. the settings view because it's no editor thus
        // getActiveTextEditor() returns null.
        if (!(editor instanceof TextEditor)) {
            return
        }

        if (!this.initializedEditors.has(editor)) {
            try {
                await this._initEditor(editor)
            }
            catch (error) {
                // NOTE: Must not throw error here because otherwise a potential
                //       editor switch would be interrupted
                //       (see _init -> observeActivePaneItem).
                logger.error(`Error while initializing the editor with path '${editor.getPath()}'.`)
                logger.error(error)
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE

    static async _onDidSaveAnnotationsDb(annotationsDbEditor) {
        const annotationsDb = await AnnotationsDb.getInstance(
            annotationsDbEditor,
            {bound: false},
        )
        await annotationsDb.readAnnotations()
        await this._reloadEditors(Object.keys(annotationsDb.annotations))
    }

    static _reloadEditors(relativePaths) {
        const editors = this.initializedEditors
        return Promise.all(
            [...editors.values()]
            .filter(editor => {
                const needsReinit = relativePaths.some(
                    relativePath => editor.getPath().endsWith(relativePath)
                )
                return needsReinit
            })
            .map(editor => this._reinitEditor(editor))
        )
    }

    // this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    static async _initEditor(editor) {
        const annotations = await AnnotationsDb.getAnnotations(editor)

        // no annotations => nothing to initialize
        if (annotations.length === 0) {
            return
        }

        const annotationsByLine = groupBy(annotations, 'lineNumber')
        editor.addGutter({
            name: GUTTER_NAME,
            priority: Config.get('gutter.priority'),
            visible: true,
        })

        const subscriptions = new CompositeDisposable()
        this.editorData.set(editor, {
            subscriptions,
            // Items are added in '_addGutterIcon'.
            markers: [],
        })

        for (const lineNumberStr of Object.keys(annotationsByLine)) {
            // It's nicer to store 1-based line number in '.annotations.cson'
            // for manual editing.
            const lineNumber = parseInt(lineNumberStr, 10)
            this._addGutterIcon(editor, lineNumber)
        }

        // Support renaming open editors' files.
        // Changing unopen files won't be listened to.
        // TODO: maybe we should support renaming unopen files.
        let editorPath = editor.getPath()
        subscriptions.add(
            editor.onDidChangePath(() => {
                this._onDidChangeEditorPath(editor, editorPath)
                editorPath = editor.getPath()
            }),
            editor.onDidDestroy(() => {
                this._uninitEditor(editor)
            }),
        )
    }

    // @param lineNumber {Number} The 'human' lineNumber (1-based).
    static _addGutterIcon(editor, lineNumber) {
        const row = lineNumber - 1
        const gutter = editor.gutterWithName(GUTTER_NAME)
        const indentation = editor.indentationForBufferRow(row)
        const lineText = editor.lineTextForBufferRow(row)
        // Format is [row, column].
        const range = [
            [row, indentation],
            [row, lineText.length - 1]
        ]
        const marker = this._createAnnotationMarker(editor, range)
        const gutterIcon = document.createElement('div')
        gutterIcon.classList.add(
            'code-annotation-gutter-icon',
            'icon',
            `icon-${Config.get('gutter.icon')}`,
        )
        gutter.decorateMarker(marker, {item: gutterIcon})
        const handleClick = async event => {
            // Dynamically get the latest annotations on the marker's line.
            const annotations = await AnnotationsDb.getAnnotations(
                editor,
                marker.getHeadBufferPosition().row + 1,
            )
            this.showContainer({annotations})
        }
        gutterIcon.addEventListener('click', handleClick)

        const editorDatum = this.editorData.get(editor)
        editorDatum.subscriptions.add(new Disposable(() => {
            gutterIcon.removeEventListener('click', handleClick)
        }))
        editorDatum.markers.push(marker)
    }

    static _uninitEditor(editor) {
        if (this.initializedEditors.has(editor)) {
            const gutter = editor.gutterWithName(GUTTER_NAME)
            // The gutter may not exist in case the editor was already destroyed.
            gutter && gutter.destroy()
            this.editorData.get(editor).subscriptions.dispose()
            this.editorData.delete(editor)
        }
        else {
            logger.warn(
                '`_uninitEditor` should not be called for uninitialized editors'
            )
        }
    }

    static async _reinitEditor(editor) {
        this._uninitEditor(editor)
        await this._initEditor(editor)
    }

    // The created instances of AnnotationsDb can be retrieved with
    // 'AnnotationsDb.getInstance'.
    static _loadAnnotationsDbs(projectDirectoriesWithAnnotations) {
        return Promise.all(
            projectDirectoriesWithAnnotations.map(projectDir =>
                AnnotationsDb.new(projectDir)
            )
        )
    }

    static async _onDidChangeEditorPath(editor, oldEditorPath) {
        // If the editor has no annotations we don't need to do anything even
        // if it has been moved into another folder with another db file.
        if (this.initializedEditors.has(editor)) {
            // Since the editor is initialized it should have a AnnotationsDb
            // instance.
            const oldAnnotationsDb = AnnotationsDb.getInstanceForPath(
                oldEditorPath,
            )
            const removedAnnotations = await oldAnnotationsDb.deleteAll(oldEditorPath)
            const newAnnotationsDb = AnnotationsDb.getInstance(editor)
            if (newAnnotationsDb) {
                await newAnnotationsDb.add(editor, removedAnnotations)
            }
            await this._reinitEditor(editor)
        }
    }

    static _createAnnotationMarker(editor, range) {
        const marker = editor.markBufferRange(range, {invalidate: 'never'})
        // update AnnotationsDb
        this.subscriptions.add(marker.onDidChange(async event => {
            const {
                oldHeadBufferPosition: {row: oldRow},
                newHeadBufferPosition: {row: newRow},
            } = event
            if (oldRow !== newRow) {
                const annotationsDb = await AnnotationsDb.getInstance(editor)
                annotationsDb.updateLineNumber(oldRow + 1, newRow + 1)
            }
        }))
        return marker
    }
}
