'use babel'

import path from 'path'
import {
    CompositeDisposable,
    TextEditor,
} from 'atom'

import CodeAnnotations from './constants'
import Config from './config'
import * as Utils from './utils'
import AnnotationsDb from './annotations-db'
import Annotation from './annotation'
import * as Renderers from './asset-renderers/all-renderers'
import ShowAllView from './views/show-all-view'
import ShowCommandsView from './views/show-commands-view'
import CodeAnnotationContainer from './views/annotation-container'
import CodeAnnotationNameDialog from './views/asset-name-dialog'


export default {
    config: Config.configData,

    // INSTANCE PROPERTIES
    // commands:                 Object(String, Function)
    // subscriptions:            CompositeDisposable
    // loadedRendererClasses:    Array of AssetRenderer
    // annotationRegexCache:     Object(String, RegExp)
    // assetManagers:            Object(String, AnnotationsDb)
    // initializedEditors:       Object(String, TextEditor
    // codeAnnotationContainer:  CodeAnnotationContainer

    // showAllView               ShowAllView

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (ATOM API)
    activate(state) {
        // TODO: this is weird:
        // those are set in the constructor of the CodeAnnotationContainer
        this.textColor = null
        this.backgroundColor = null
        this.commands = null
        this.subscriptions = new CompositeDisposable()
        this.loadedRendererClasses = []
        this.annotationRegexCache = {}
        this.assetManagers = {}
        this.initializedEditors = new Map()
        this.codeAnnotationContainer = new CodeAnnotationContainer(this)
        this.showAllView = new ShowAllView()
        this.showCommandsView = new ShowCommandsView()

        this._init()
    },

    deactivate() {
        this.subscriptions.dispose()
        this.codeAnnotationContainer.destroy()
        this._destroyGutters()
    },

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (services)

    // API method for plugin packages to register their own renderers for file types
    // TODO: could return asset manager data for better performance
    //       after git pull the passed data could then be invalid
    //       -> user must have the possibility to manually reload the asset files
    registerRendererClass(rendererClass) {
        const adjustedRendererClass = Renderers.AssetRenderer.ensureSameApi(rendererClass)
        if (adjustedRendererClass == null) {
            throw new Error(
                `Invalid asset renderer '${rendererClass.getName()}'. `
                + 'Expected a subclass of AssetRenderer or a class that has an equivalent API.'
            )
        }
        this.loadedRendererClasses.push(adjustedRendererClass)
    },

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (associated with commands)

    addAnnotation(callback, point) {
        const editor = atom.workspace.getActiveTextEditor()
        let assetDirectory = this._getRawAnnotationsForEditor(editor)
        if (assetDirectory == null) {
            // assetDirectory = this._initAssetDirectory(editor)
            this._initEditor(editor, editor.getPath())
        }
        const dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit(name => {
            // TODO: this does not exist anymore
            //       Use 'AnnotationsDb.getInstanceForEditor(editor)' instead.
            const assetManager = this.assetManagers[assetDirectory.getPath()]
            // TODO: make is possible to reference an existing annotation
            if (assetManager.has(name) && Config.showReplaceConfirmDialog) {
                const buttons = ['Replace', 'Reference', 'Cancel']
                const choice = buttons[atom.confirm({message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name), buttons})]
                switch (choice) {
                    case 'Cancel':
                        return this
                    case 'Reference':
                        return this.addExistingCodeAnnotation(editor, point, name, assetManager)
                }
            }
            // when "Replace" then continue
            callback.call(this, editor, point, name, assetManager)
        })
    },

    addAnnotationWithFile(editor, point, name, assetManager) {
        const paths = Utils.chooseFile('Now, choose an asset.')
        if ((paths == null) || !paths.length) {
            return
        }
        assetManager.set(name, paths[0]).save()
        const annotation = this._createNewAnnotation(editor, point, name, assetManager)
        // cleanup the created files
        if (annotation == null) {
            assetManager.delete(name).save()
            throw new Error('Could not add code annotation. Please report this bug!')
        }
    },

    addAnnotationWithContent(editor, point, name, assetManager) {
        assetManager.createFromName(name).save()
        const annotation = this._createNewAnnotation(editor, point, name, assetManager)
        if (annotation != null) {
            annotation.edit()
        }
        else {
            // cleanup the created files
            assetManager.delete(name).save()
            throw new Error('Could not add code annotation. Please report this bug!')
        }
    },

    addExistingCodeAnnotation(editor, point, name, assetManager) {
        this._createNewAnnotation(editor, point, name, assetManager)
    },

    deleteAnnotations(points) {
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
    },

    showAll() {
        this.showAllView.show(this.getAllCodeAnnotations())
    },

    showCommands() {
        this.showCommandsView.show(['code-annotations:show-commands'])
    },

    reload() {
        this.deactivate()
        this.activate(this.serialize)
    },

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC

    // grouped by editor paths
    getAllCodeAnnotations() {
        const annotations = {}
        // for (const [editorPath, editorData] of Object.entries(this.initializedEditors)) {
        for (const [editorPath, editorData] of this.initializedEditors.entries()) {
            annotations[editorPath] = editorData.annotations
        }
        return annotations
    },

    showContainer(annotation, renderedContent) {
        this.codeAnnotationContainer
            .setAnnotation(annotation)
            .setContent(renderedContent)
            .show()
    },

    hideContainer() {
        this.codeAnnotationContainer.hide()
    },

    loadEditor(editor) {
        // console.log('loading editor with path', editor.getPath())
        // console.log(this.initializedEditors)
        // initialize if not already done so AND if the editor's grammar has support for code annotations
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
    },

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE
    _init: function() {
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
    },

    // this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor(editor) {
        // TODO: migrate data if directory exists!
        //       Or better: add a command for manually migrating stuff.
        //       This makes the implementation easier.
        const rawAnnotations = this._getRawAnnotationsForEditor(editor)
        console.log('in _initEditor.......', path.basename(editor.getPath()), rawAnnotations)

        // no annotations => nothing to initialize
        if (rawAnnotations.length === 0) {
            return
        }

        const gutter = editor.addGutter({
            name: CodeAnnotations.GUTTER_NAME,
            priority: Config.gutterPriority,
            visible: true,
        })

        // const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
        const annotations = []
        for (const rawAnnotation of rawAnnotations) {
            const {lineNumber} = rawAnnotation
            const indentation = editor.indentationForBufferRow(lineNumber)
            const lineText = editor.lineTextForBufferRow(lineNumber)
            // row/column
            const range = [
                [lineNumber, indentation],
                [lineNumber, lineText.length - 1]
            ]
            const marker = this._createAnnotationMarker(editor, range)
            const annotationInstance = this._instantiateCodeAnnotation({
                editor,
                marker,
                gutter,
                rawAnnotation,
            })
            if (annotationInstance != null) {
                annotations.push(annotationInstance)
            }
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
            rawAnnotations,
            annotations,
            gutter,
        })
    },

    _uninitEditor(editor) {
        const editorData = this.initializedEditors.get(editor)
        if (editorData != null) {
            for (const annotation of editorData.annotationInstances) {
                annotation.destroy()
            }
            Utils.getGutterWithName(editor, CodeAnnotations.GUTTER_NAME).destroy()
            this.initializedEditors.delete(editor)
        }
        else {
            console.warn(
                '`_uninitEditor` should not be called for uninitialized editors'
            )
        }
    },

    _reinitializeEditor(editor) {
        this._uninitEditor(editor)
        this._initEditor(editor)
    },

    _registerRenderers() {
        console.log('>>>', Config)
        for (const name in Config.configData.renderers.properties) {
            if (Config[name] === true) {
                this.registerRendererClass(Renderers[name.replace('load', '')])
            }
        }
    },

    // get the name of the annotation at the given point
    _getCodeAnnotationsAtPoint(editor, point) {
        return (
            this.initializedEditors.get(editor)
            .annotationInstances
            .filter(annotation =>
                annotation.marker.getBufferRange().start.row === point.row
            )
        )
    },

    // takes care of removing the unnecessary stuff (i.e. dom nodes)
    // i guess all refs to this singleton are also disposed so everything else will be cleared from memory as well
    _destroyGutters() {
        for (const editor of this.initializedEditors.keys()) {
            const gutter = Utils.getGutterWithName(
                editor,
                CodeAnnotations.GUTTER_NAME,
            )
            gutter.destroy()
        }
    },

    // The created instances of AnnotationsDb can be retrieved with
    // AnnotationsDb.getInstanceForEditor().
    _loadAnnotationsDbs(projectDirectoriesWithAnnotations) {
        for (const projectDir of projectDirectoriesWithAnnotations) {
            new AnnotationsDb(projectDir)
        }
    },

    // TODO: Measure the performance diff with cache vs. without cache.
    //       If it's insignificant (which it most likely is) remove caching
    //       as it makes it harder to find bugs.
    _getRawAnnotationsForEditor(editor, useCache=true) {
        if (useCache && this.initializedEditors.has(editor)) {
            const {rawAnnotations} = this.initializedEditors.get(editor)
            return rawAnnotations
        }
        return AnnotationsDb.getAnnotationsForEditor(editor)
    },

    // TODO: _reinitializeEditor should always be sufficient.
    //       Except when '.annotations.js' has to be created.
    _onDidChangeEditorPath(editor, oldEditorPath) {
        let newAssetManager = AnnotationsDb.getInstanceForEditor(editor)
        // TextEditor has been moved into another project folder that has no
        // '.annotations.js' file (thus is uninitialized).
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
    },

    _registerCommands() {
        this.commands = {
            'code-annotations:add-annotation-with-file': () =>
                this.addAnnotation(
                    this.addAnnotationWithFile,
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPosition()
                ),
            'code-annotations:add-annotation-with-content': () =>
                this.addAnnotation(
                    this.addAnnotationWithContent,
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPosition()
                ),
            'code-annotations:add-existing-annotation': () =>
                this.addAnnotation(
                    this.addExistingCodeAnnotation,
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPosition()
                ),
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
    },

    _registerElements() {
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
    },

    _createAnnotationMarker(editor, range) {
        const marker = editor.markBufferRange(range, {invalidate: 'surround'})
        marker.setProperties({
            originalText: editor.getTextInBufferRange(range).trim()
        })

        this.subscriptions.add(marker.onDidChange(event => {
            const properties = marker.getProperties()
            if (event.textChanged) {
                const currentRange = marker.getBufferRange()
                const markerText = editor.getTextInBufferRange(currentRange).trim()
                const {annotation} = properties
                if (markerText.length > 0) {
                    // non-whitespace text changes => custom invalidate
                    if (properties.originalText !== markerText) {
                        annotation.invalidate()
                    }
                    else {
                        // changed text back to oringal => it's valid again
                        annotation.validate()
                    }
                }
                else {
                    const editorData = this.initializedEditors[editor.getPath()]
                    editorData.annotations = editorData.annotations.filter(
                        a => a !== annotation
                    )
                    if (Config.showDeleteConfirmDialog && Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
                        annotation.delete(false)
                    }
                    else {
                        annotation.destroy()
                    }
                }
            }
        }))
        return marker
    },

    /*
    * Creates an entirely new code annotation.
    * Therefore, an asset is copied and the .names.cson is updated.
    * @param Object assetManager Equals this.assetManagers[current editor's asset path].
    */
    _createNewAnnotation(editor, point, name, assetManager) {
        const editorData = this.initializedEditors.get(editor)
        if (editorData == null) {
            throw new Error(`The editor with path '${editor.getPath()}' has not been initialized but it should. Please report this bug!`)
        }
        const indentation = editor.indentationForBufferRow(point.row)
        let range = [
            [point.row, 0],
            [point.row, 0]
        ]
        let line = `${CodeAnnotations.CODE_KEYWORD.trim()} ${name}\n`
        editor.setTextInBufferRange(range, line)
        // make it a comment
        editor.setSelectedBufferRange(range)
        editor.toggleLineCommentsInSelection()
        // make sure it's indented correctly
        editor.setIndentationForBufferRow(point.row, indentation)
        editor.setCursorBufferPosition([
            point.row, line.length - 1
        ])
        line = editor.lineTextForBufferRow(point.row)
        // correct range to end of line
        range = [
            range[0],
            [point.row, line.length]
        ]
        const marker = this._createAnnotationMarker(editor, range)
        const annotation = this._instantiateCodeAnnotation(
            {
                editor,
                marker,
                gutter: editorData.gutter
            },
            {
                assetManager,
                assetDirectory: editorData.assetDirectory,
                name,
                line
            }
        )
        if (annotation != null) {
            editorData.annotations.push(annotation)
        }
        return annotation
    },

    _instantiateCodeAnnotation(kwargs) {
        let annotation
        try {
            annotation = new Annotation(this, kwargs)
        }
        catch (error) {
            annotation = null
            atom.notifications.addError('Could not instantiate code annotation.', {
                detail: error.message,
                dismissable: true
            })
            console.error(error)
        }
        return annotation
    },
}
