'use babel'

import {
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
    GUTTER_NAME
} from './constants'
import * as Config from './config'
import AnnotationsDb from './annotations-db'
import Annotation from './views/annotation'
import RendererRegistry from './renderer-registry'
import Commands from './commands'
import ShowAllView from './views/show-all-view'
import ShowAnnotationDbsView from './views/show-annotation-dbs-view'
import CodeAnnotationContainer from './views/annotation-container'
import Dialog from './views/dialog'
import {filterAsync} from './utils'
import {ValueError, AbortError} from './errors'
import {defaultLogger as logger} from './logging'


export default class AnnotationManager {
    static config = Config.config

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (ATOM API)
    // TODO: this method may return a promise
    // see https://github.com/atom/atom/blob/d6a3a604695df62a7b813bd229316042a501aee5/src/package-manager.js#L678-L704
    static activate(state) {
        this.subscriptions = new CompositeDisposable()
        this.initializedEditors = new Set()
        this.showAllView = new ShowAllView()
        this.showAnnotationDbsView = new ShowAnnotationDbsView()

        this.deleteAnnotation = this.deleteAnnotation.bind(this)
        this.editAnnotation = this.editAnnotation.bind(this)

        this.subscriptions.add(
            atom.commands.add('atom-workspace', Commands.boundTo(this))
        )
        this.subscriptions.add(
            atom.workspace.observeActivePaneItem(editor => {
                this.loadEditor(editor)
            })
        )

        window.setTimeout(
            async () => {
                RendererRegistry.registerBuiltIns()

                const directories = await filterAsync(
                    atom.project.getDirectories(),
                    dir => dir.getFile(ANNOTATIONS_DB_FILENAME).exists(),
                )
                await this._loadAnnotationsDbs(directories)

                this.loadEditor(atom.workspace.getActiveTextEditor())

                this.mountPoint = document.createElement('div')
                this.mountPoint.classList.add('code-annotations-mount-point')
                atom.views.getView(atom.workspace).appendChild(this.mountPoint)
            },
            0
        )
    }

    static deactivate() {
        this.subscriptions.dispose()
        // Destroy container.
        ReactDom.unmountComponentAtNode(this.mountPoint)
        this.mountPoint.remove()
        this._destroyGutters()
    }

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (services)

    // API method for plugin packages to register their own renderers for file types
    static registerRenderer(rendererClass) {
        RendererRegistry.register(rendererClass)
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
            Object.entries(RendererRegistry.getRenderers())
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
            content = await Annotation.askForContent(type, title)
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
                const replace = atom.confirm({
                    message,
                    buttons: {
                        Replace: () => true,
                        Cancel: () => false,
                    },
                })
                if (replace) {
                    annotationsDb.delete(similarRawAnnotations)
                }
            }
        }

        await annotationsDb.add({
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

    static showAll() {
        const items = this.getAllAnnotations().map(annotation => {
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

    static getAllAnnotations() {
        const editor = atom.workspace.getActiveTextEditor()
        const db = AnnotationsDb.getInstanceForEditor(editor, {bound: false})
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

    static updateContainer(props) {
        this.container = ReactDom.render(
            <CodeAnnotationContainer
                {...props}
                editor={atom.workspace.getActiveTextEditor()}
                // hidden={false}
                deleteAnnotation={this.deleteAnnotation}
                editAnnotation={this.editAnnotation}
            />,
            this.mountPoint,
        )
    }
    static showContainer(props) {
        this.updateContainer({
            hidden: false,
            ...props,
        })
    }

    static hideContainer() {
        this.updateContainer({
            hidden: true,
        })
    }

    static async deleteAnnotation(editor, lineNumber, index) {
        const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
        await annotationsDb.deleteAt(lineNumber, index)
        const annotations = annotationsDb.getAnnotations(lineNumber)
        if (annotations.length > 0) {
            this.showContainer({annotations})
        }
        else {
            this.hideContainer()
        }
        this._reinitializeEditor(editor)
    }

    static async editAnnotation(editor, lineNumber, index, newContent) {
        const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
        // There must be a DB instance because we currently show annotations
        // for the active text editor.
        await annotationsDb.updateAt(lineNumber, index, {content: newContent})
        this._reinitializeEditor(editor)
    }

    static loadEditor(editor) {
        // This happens for e.g. the settings view because it's no editor thus
        // getActiveTextEditor() returns null.
        if (!editor || !(editor instanceof TextEditor)) {
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
                logger.error(`Error while initializing the editor with path '${editor.getPath()}'.`)
                logger.error(error)
            }
        }
    }

    static reloadEditors(relativePaths) {
        // Creating an array is necessary because '_reinitializeEditor' modifies
        // the iterated set. Iterating 'this.initializedEditors.keys()' directly
        // would cause an infinite loop.
        const editors = [...this.initializedEditors.values()]
        for (const editor of editors) {
            const editorNeedsReinit = relativePaths.some(
                relativePath => editor.getPath().endsWith(relativePath)
            )
            if (editorNeedsReinit) {
                this._reinitializeEditor(editor)
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE

    // this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    static _initEditor(editor) {
        // TODO: migrate data if directory exists!
        //       Or better: add a command for manually migrating stuff.
        //       This makes the implementation easier.
        const annotations = AnnotationsDb.getAnnotations(editor)

        // no annotations => nothing to initialize
        if (annotations.length === 0) {
            return
        }

        const annotationsByLine = groupBy(annotations, 'lineNumber')
        const gutter = editor.addGutter({
            name: GUTTER_NAME,
            priority: Config.get('gutter.priority'),
            visible: true,
        })

        for (const [lineNumberStr, annotations] of Object.entries(annotationsByLine)) {
            // TODO: This must become a separate method with a dynamic lookup
            //       for annotation on a line if adding an annotation does NOT
            //       cause reinitializing the editor!

            // It's nicer to store 1-based line number in '.annotations.cson'
            // for manual editing.
            const lineNumber = parseInt(lineNumberStr, 10) - 1
            const indentation = editor.indentationForBufferRow(lineNumber)
            const lineText = editor.lineTextForBufferRow(lineNumber)
            // Format is [row, column].
            const range = [
                [lineNumber, indentation],
                [lineNumber, lineText.length - 1]
            ]
            const marker = this._createAnnotationMarker(editor, range)
            const gutterIcon = document.createElement('div')
            gutterIcon.classList.add(
                'code-annotation-gutter-icon',
                'icon',
                `icon-${Config.get('gutter.icon')}`,
            )
            gutter.decorateMarker(marker, {item: gutterIcon})
            gutterIcon.addEventListener('click', event => {
                this.showContainer({annotations})
            })
        }

        // Support renaming open editors' files.
        // Changing unopen files won't be listened to.
        let editorPath = editor.getPath()
        this.subscriptions.add(editor.onDidChangePath(() => {
            this._onDidChangeEditorPath(editor, editorPath)
            editorPath = editor.getPath()
        }))

        this.subscriptions.add(editor.onDidDestroy(() =>
            this.initializedEditors.delete(editor)
        ))

        this.initializedEditors.add(editor)
    }

    static _uninitEditor(editor) {
        // TODO: save subscriptions from _initEditor and dispose them
        //       to prevent memory leaks
        if (this.initializedEditors.has(editor)) {
            editor.gutterWithName(GUTTER_NAME).destroy()
            this.initializedEditors.delete(editor)
        }
        else {
            logger.warn(
                '`_uninitEditor` should not be called for uninitialized editors'
            )
        }
    }

    static _reinitializeEditor(editor) {
        this._uninitEditor(editor)
        this._initEditor(editor)
    }

    // takes care of removing the unnecessary stuff (i.e. dom nodes)
    // i guess all refs to this singleton are also disposed so everything else will be cleared from memory as well
    static _destroyGutters() {
        for (const editor of this.initializedEditors) {
            editor.gutterWithName(GUTTER_NAME).destroy()
        }
    }

    // The created instances of AnnotationsDb can be retrieved with
    // 'AnnotationsDb.getInstanceForEditor'.
    static _loadAnnotationsDbs(projectDirectoriesWithAnnotations) {
        return Promise.all(
            projectDirectoriesWithAnnotations.map(projectDir =>
                AnnotationsDb.new(
                    projectDir,
                    paths => this.reloadEditors(paths)
                )
            )
        )
    }

    // FIXME: ...
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

        // const {
        //     assetManager: oldAssetManager,
        // } = this.initializedEditors.get(oldEditorPath)
        // const newEditorPath = editor.getPath()
        // TextEditor has been moved within the same project folder.
        // if (newAssetManager === oldAssetManager) {
        //     this.initializedEditors.delete(editor)
        //     // delete this.initializedEditors.get(oldEditorPath)
        //     // this.initializedEditors.get(newEditorPath) = {
        //     //     ...this.initializedEditors.get(oldEditorPath),
        //     //     assetManager: newAssetManager,
        //     // }
        // }
        // // TextEditor has been moved into another project folder.
        // else {
        //     oldAssetManager.move(newAssetManager)
        // }
        this._reinitializeEditor(editor)
    }

    static _createAnnotationMarker(editor, range) {
        const marker = editor.markBufferRange(range, {invalidate: 'never'})
        // // update AnnotationsDb
        // TODO: update other editor instances (i.e. when using split pane)
        this.subscriptions.add(marker.onDidChange(event => {
            const {
                oldHeadBufferPosition: {row: oldRow},
                newHeadBufferPosition: {row: newRow},
            } = event
            if (oldRow !== newRow) {
                const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
                annotationsDb.updateLineNumber(oldRow + 1, newRow + 1)
            }
        }))
        return marker
    }
}
