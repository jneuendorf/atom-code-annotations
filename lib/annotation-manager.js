'use babel'

import {
    CompositeDisposable,
    // Directory,
    // File,
    // Range,
    TextEditor,
} from 'atom'
import CommentCharacters from './comment-characters'
import CodeAnnotations from './constants'
import Config from './config'
import * as Utils from './utils'
import AssetManager from './asset-manager'
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
    // rendererClasses:          Array of AssetRenderer
    // annotationRegexCache:     Object(String, RegExp)
    // assetManagers:            Object(String, AssetManager)
    // assetDirectories:         Array of Directory
    // initializedEditors:       Object(String, TextEditor
    // codeAnnotationContainer:  CodeAnnotationContainer
    // ignoredEditors:           Object(String, TextEditor)
    // fallbackRenderer:         AssetRenderer
    // showAllView               ShowAllView

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (ATOM API)
    activate(state) {
        // those are set in the constructor of the CodeAnnotationContainer
        this.textColor = null
        this.backgroundColor = null
        this.commands = null
        this.subscriptions = new CompositeDisposable()
        this.rendererClasses = []
        this.annotationRegexCache = {}
        this.assetManagers = {}
        this.assetDirectories = []
        this.initializedEditors = {}
        this.ignoredEditors = {}
        this.codeAnnotationContainer = new CodeAnnotationContainer(this)
        this.showAllView = new ShowAllView()
        this.showCommandsView = new ShowCommandsView()
        this.fallbackRenderer = Renderers[Config.fallbackRenderer] || null
        this._init()
        return this
    },

    deactivate() {
        this.subscriptions.dispose()
        this.codeAnnotationContainer.destroy()
        this._destroyGutters()
        return this
    },

    serialize() {
        return {}
    },

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (services)

    // API method for plugin packages to register their own renderers for file types
    // TODO: could return asset manager data for better performance
    //       after git pull the passed data could then be invalid
    //       -> user must have the possibility to manually reload the asset files
    registerRenderer(rendererClass) {
        const adjustedRendererClass = Renderers.AssetRenderer.ensureSameApi(rendererClass)
        if (adjustedRendererClass == null) {
            const rendererName = (
                rendererClass.getName
                ? rendererClass.getName()
                : rendererClass.name
            )
            throw new Error(
                `Invalid asset renderer '${rendererName}'. `
                + 'Expected a subclass of AssetRenderer or a class that has an equivalent API.'
            )
        }
        this.rendererClasses.push(adjustedRendererClass)
    },

    ///////////////////////////////////////////////////////////////////////////
    // PUBLIC (associated with commands)

    // CODE-ANNOTATION: image-testasset
    // CODE-ANNOTATION: inline-html-testasset
    // CODE-ANNOTATION: html-testasset
    // CODE-ANNOTATION: text-testasset
    // CODE-ANNOTATION: url-testasset
    addAnnotation(callback, point) {
        const editor = atom.workspace.getActiveTextEditor()
        let assetDirectory = this._getAssetDirectoryForEditor(editor)
        if (assetDirectory == null) {
            assetDirectory = this._initAssetDirectory(editor)
            this._initEditor(editor, editor.getPath())
        }
        const dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit(name => {
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

    deleteAnnotation(point) {
        const editor = atom.workspace.getActiveTextEditor()
        const annotation = this._getCodeAnnotationAtPoint(editor, point)
        if (annotation == null) {
            atom.notifications.addInfo('There is no code annotation to remove.')
            return
        }
        if (Config.showDeleteConfirmDialog && !Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
            return
        }

        try {
            annotation.delete()
        }
        catch (error) {
            throw new Error('Could not find a code annotation at the current cursor.')
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
        for (const [editorPath, editorData] of Object.entries(this.initializedEditors)) {
            annotations[editorPath] = editorData.annotations
        }
        return annotations
    },

    showContainer(annotation, renderedContent) {
        this.codeAnnotationContainer
            .setCodeAnnotation(annotation)
            .setContent(renderedContent)
            .show()
    },

    hideContainer() {
        this.codeAnnotationContainer.hide()
    },

    loadCurrentEditor() {
        const editor = atom.workspace.getActiveTextEditor()
        const path = editor.getPath()
        // initialize if not already done so AND if the editor's grammar has support for code annotations
        if (((this.initializedEditors[path] == null) || this.initializedEditors[path].editor !== editor) && (this.ignoredEditors[path] == null)) {
            try {
                this._initEditor(editor, path)
            }
            catch (error) {
                // NOTE: must not throw error here because otherwise the editor switch will be interrupted
                console.error(`Error while initializing the editor with path '${editor.getPath()}'.`, error.message)
            }
        }
    },

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE
    _init: function() {
        for (const dir of atom.project.getDirectories()) {
            const subdir = dir.getSubdirectory(CodeAnnotations.ASSET_DIR_NAME)
            if (subdir.existsSync()) {
                this.assetDirectories.push(subdir)
            }
        }
        try {
            this._registerElements()
        }
        catch (error) {
            atom.notifications.addInfo('Custom DOM elements already registered.')
        }
        this._registerCommands()
        this._loadAssetManagers()
        this._registerRenderers()
        if (!Config.manuallyLoadCodeAnnotations) {
            atom.workspace.observeActivePaneItem(editor => {
                this.codeAnnotationContainer.hide()
                if (editor instanceof TextEditor) {
                    const path = editor.getPath()
                    // initialize if not already done so AND if the editor's grammar has support for code annotations
                    if (((this.initializedEditors[path] == null) || this.initializedEditors[path].editor !== editor) && (this.ignoredEditors[path] == null)) {
                        try {
                            this._initEditor(editor, path)
                        }
                        catch (error) {
                            // must not throw error here because otherwise the editor switch will be interrupted
                            console.error(`code-annotations: Error while initializing the editor with path '${editor.getPath()}'.`, error.message, error.stack)
                        }
                    }
                }
            })
        }
    },

    // this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor(editor, editorPath) {
        const assetDirectory = this._getAssetDirectoryForEditor(editor)
        // no asset directory => no .code-annotations folder => nothing to do anyways
        if (assetDirectory == null) {
            return
        }

        const grammar = editor.getGrammar()
        let regex
        try {
            regex = this._getAnnotationRegex(grammar)
        }
        catch (error) {
            // comments not supported => do not modify editor
            this.ignoredEditors[editorPath] = editor
            console.log(`unsupported grammer (no comments available => thus no annotations). error: ${error.message}`, editorPath)
            return
        }

        // console.log(`initializing editor w/ path: ${editorPath}`, 'regex', regex)
        const gutter = editor.addGutter({
            name: CodeAnnotations.GUTTER_NAME,
            priority: Config.gutterPriority,
            visible: true
        })
        const ranges = []
        const assetData = []
        editor.scan(regex, function({match, matchText, range}) {
            assetData.push({
                line: editor.lineTextForBufferRow(range.start.row),
                name: match[2].trim()
            })
            ranges.push(range)
            return true
        })
        const assetManager = this.assetManagers[assetDirectory.getPath()]
        const annotations = []
        for (const i in ranges) {
            const range = ranges[i]
            const marker = this._createAnnotationMarker(editor, range)
            const annotation = this._instantiateCodeAnnotation(
                {editor, marker, gutter},
                {
                    assetManager,
                    assetDirectory,
                    name: assetData[i].name,
                    line: assetData[i].line
                }
            )
            if (annotation != null) {
                annotations.push(annotation)
            }
        }
        // support renaming open editors' files - changing unopen files won't be listened to
        this.subscriptions.add(editor.onDidChangePath(() => {
            this._onDidChangeEditorPath(editor, editorPath)
            editorPath = editor.getPath()
            return true
        }))
        this.subscriptions.add(editor.onDidDestroy(() => {
            delete this.initializedEditors[editorPath]
        }))
        this.initializedEditors[editorPath] = {
            assetDirectory,
            assetManager,
            annotations,
            editor,
            gutter
        }
    },

    _uninitEditor(editor, editorPath) {
        if (this.initializedEditors[editorPath] != null) {
            for (const annotation of this.initializedEditors[editorPath].annotations) {
                annotation.destroy()
            }
            Utils.getGutterWithName(editor, CodeAnnotations.GUTTER_NAME).destroy()
            delete this.initializedEditors[editorPath]
        }
        return this
    },

    _reinitializeEditor(editor, editorPath) {
        this._uninitEditor(editor, editorPath)._initEditor(editor, editorPath)
    },

    _registerRenderers() {
        for (const name in Config.configData.renderers.properties) {
            if (Config[name] === true) {
                this.registerRenderer(Renderers[name.slice(4)])
            }
        }
    },

    _initAssetDirectory(editor) {
        let assetDirectory

        const editorPath = editor.getPath()
        for (const directory of atom.project.getDirectories()) {
            if (!(directory.contains(editorPath))) {
                continue
            }
            assetDirectory = directory.getSubdirectory(CodeAnnotations.ASSET_DIR_NAME)
            const assetDirectoryPath = assetDirectory.getPath()
            Utils.createDirectory(assetDirectoryPath)
            Utils.createFile(
                [assetDirectoryPath, CodeAnnotations.ASSET_NAMES_FILE],
                '{}'
            )
            this.assetDirectories.push(assetDirectory)
            this.assetManagers[assetDirectoryPath] = new AssetManager(assetDirectoryPath)
        }
        return assetDirectory
    },

    // get the name of the annotation at the given point
    _getCodeAnnotationAtPoint(editor, point) {
        for (const annotation of this._getEditorData(editor).annotations) {
            if (annotation.marker.getBufferRange().start.row === point.row) {
                return annotation
            }
        }
        return null
    },

    // takes care of removing the unnecessary stuff (i.e. dom nodes)
    // i guess all refs to this singleton are also disposed so everything else will be cleared from memory as well
    _destroyGutters() {
        for (const editorData of Object.values(this.initializedEditors)) {
            Utils.getGutterWithName(editorData.editor, CodeAnnotations.GUTTER_NAME).destroy()
        }
    },

    _loadAssetManagers() {
        for (const assetDirectory of this.assetDirectories) {
            const path = assetDirectory.getPath()
            this.assetManagers[path] = new AssetManager(path)
        }
    },

    _getAssetDirectoryForEditor(editor, useCache=true) {
        const editorPath = editor.getPath()
        const initializedEditor = this.initializedEditors[editorPath]
        // return from "cache"
        if (useCache) {
            if (initializedEditor && initializedEditor.assetDirectory) {
                return initializedEditor.assetDirectory
            }
        }

        // actually find the dir
        for (const assetDirectory of this.assetDirectories) {
            const projectRoot = assetDirectory.getParent()
            if (projectRoot.contains(editorPath)) {
                return assetDirectory
            }
        }
        // # found no asset directory => maybe there is non yet => check in all projects
        // throw new Error("Cannot add a code annotation to files outside of the current projects.")
        return null
    },

    _onDidChangeEditorPath(editor, oldEditorPath) {
        const newEditorPath = editor.getPath()
        let newAssetDirectory = this._getAssetDirectoryForEditor(editor, false)
        const oldEditorData = this.initializedEditors[oldEditorPath]

        let newAssetDir = newAssetDirectory ? newAssetDirectory.getPath() : null
        const oldAssetDir = oldEditorData.assetDirectory.getPath()
        // editor has been moved within the same project folder => just update key of @initializedEditors
        if (newAssetDir === oldAssetDir) {
            delete this.initializedEditors[oldEditorPath]
            this.initializedEditors[newEditorPath] = oldEditorData
            oldEditorPath = newEditorPath
            return
        }

        // editor has been moved into another project folder
        // no .code-annotations directory => create it or stop right here
        if (newAssetDirectory == null) {
            newAssetDirectory = this._initAssetDirectory(editor)
            newAssetDir = newAssetDirectory.getPath()
        }
        // move asset files to new assetDirectory and update according references
        const newAssetManager = this.assetManagers[newAssetDir]
        const oldAssetManager = this.assetManagers[oldAssetDir]
        for (const annotation of oldEditorData.annotations) {
            const name = annotation.name
            if (newAssetManager.has(name)) {
                if (Config.showReplaceConfirmDialog) {
                    if (!Utils.confirm({message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name)})) {
                        continue
                    }
                }
                newAssetManager.delete(name)
            }
            // TODO: Check if this makes sense. This was a bug in the coffeescript version.
            oldAssetManager.move(name, newAssetManager)
        }
        // TODO: Check if this makes sense. This was a bug in the coffeescript version.
        // this._reinitializeEditor(editor, editorPath)
        return this
    },

    _getEditorData(editor) {
        return this.initializedEditors[editor.getPath()] || null
    },

    _registerCommands() {
        this.commands = {
            'code-annotations:add-annotation-with-file': () => {
                this.addAnnotation(
                    this.addAnnotationWithFile,
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            },
            'code-annotations:add-annotation-with-content': () => {
                this.addAnnotation(
                    this.addAnnotationWithContent,
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            },
            'code-annotations:add-existing-annotation': () => {
                this.addAnnotation(
                    this.addExistingCodeAnnotation,
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            },
            'code-annotations:delete-annotation': () => {
                this.deleteAnnotation(
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            },
            'code-annotations:show-all': () => {
                this.showAll()
            },
            'code-annotations:show-commands': () => {
                this.showCommands()
            },
            'code-annotations:reload': () => {
                this.reload()
            },
            'code-annotations:load-current-editor': () => {
                this.loadCurrentEditor()
            },
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
                    editorData.annotations = editorData.annotations.filter(a => a !== annotation)
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
        const editorData = this._getEditorData(editor)
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

    _instantiateCodeAnnotation(editorData, assetData) {
        let annotation
        try {
            annotation = new Annotation(this, editorData, assetData, this.fallbackRenderer)
        }
        catch (error) {
            annotation = null
            atom.notifications.addError('Could not instantiate code annotation.', {
                detail: error.message,
                dismissable: true
            })
            console.error(error, assetData)
        }
        return annotation
    },

    _getAnnotationRegex(grammar) {
        const grammarName = grammar.name
        if (this.annotationRegexCache[grammarName] != null) {
            return this.annotationRegexCache[grammarName]
        }
        // const patterns = CommentCharacters[grammarName]
        // if (patterns && patterns.length > 0) {
        //     // name must begin with word character (like most common identifiers)
        //     const regexStrings = patterns.map(pattern =>
        //         `(${CodeAnnotations.SINGLE_LINE_WHITESPACE_REGEX_STR}${pattern.begin})`
        //         + CodeAnnotations.CODE_KEYWORD
        //         + '(\\w+.*)'
        //         + `(${pattern.end})`
        //     )
        //
        //     this.annotationRegexCache[grammarName] = new RegExp(
        //         `(${regexStrings.join('|')})`,
        //         'g'
        //     )
        //     return this.annotationRegexCache[grammarName]
        // }
        // const patternData = CommentCharacters.format(CommentCharacters[grammarName])
        const patternData = CommentCharacters[grammarName]
        if (patternData) {
            const {begin, end} = patternData
            // name must begin with word character (like most common identifiers)
            this.annotationRegexCache[grammarName] = new RegExp(
                `(${CodeAnnotations.SINGLE_LINE_WHITESPACE_REGEX_STR}${begin})`
                + CodeAnnotations.CODE_KEYWORD
                + '(\\w+.*)'
                + `(${end})`,
                'g'
            )
            return this.annotationRegexCache[grammarName]
        }
        // ...some grammars don't have comments (e.g. JSON)
        throw new Error(`Could not find how to create comments for grammar '${grammarName}'.`)
    }
}
