{CompositeDisposable, Directory, Range, TextEditor} = require "atom"

CommentCharacters = require "./comment-characters"
CodeAnnotations = require "./constants"
Config = require "./config"
Utils = require "./utils"

AssetManager = require "./asset-manager"
CodeAnnotation = require "./code-annotation"
Renderers = {AssetRenderer} = require "./asset-renderers/all-renderers"

ShowAllView = require "./views/show-all-view"
ShowCommandsView = require "./views/show-commands-view"
CodeAnnotationContainer = require "./views/code-annotation-container"
CodeAnnotationNameDialog = require "./views/asset-name-dialog.coffee"


module.exports =
    config: Config.configData

    # INSTANCE PROPERTIES
    # commands:                 Object(String, Function)
    # subscriptions:            CompositeDisposable
    # renderers:                Array of AssetRenderer
    # annotationRegexCache:     Object(String, RegExp)
    # assetManagers: {}
    # assetDirectories: []
    # initializedEditors:       Object(String, TextEditor
    # codeAnnotationContainer:  CodeAnnotationContainer
    # ignoredEditors:           Object(String, TextEditor)
    # fallbackRenderer:         AssetRenderer
    # showAllView               ShowAllView

    #######################################################################################
    # PUBLIC (ATOM API)

    activate: (state) ->
        console.log "could deserialize:", state
        # those are set in the constructor of the CodeAnnotationContainer
        @textColor = null
        @backgroundColor = null

        @commands = null
        @subscriptions = new CompositeDisposable()
        @renderers = []
        @annotationRegexCache = {}
        @assetManagers = {}
        @assetDirectories = []
        @initializedEditors = {}
        @ignoredEditors = {}
        @codeAnnotationContainer = new CodeAnnotationContainer(@)
        @showAllView = new ShowAllView()
        @showCommandsView = new ShowCommandsView()
        @fallbackRenderer = Renderers[Config.fallbackRenderer] or null
        @_init()
        return @

    deactivate: () ->
        @subscriptions.dispose()
        @codeAnnotationContainer.destroy()
        @_destroyGutters()
        return @

    serialize: () ->
        # TODO: could return asset manager data for better performance
        #       after git pull the passed data could then be invalid
        #       -> user must have the possibility to manually reload the asset files
        return {a: 10}

    #######################################################################################
    # PUBLIC (associated with commands)

    # CODE-ANNOTATION: image-testasset
    # CODE-ANNOTATION: html-testasset
    # CODE-ANNOTATION: framed-html-testasset
    # CODE-ANNOTATION: text-testasset
    # CODE-ANNOTATION: url-testasset

    addCodeAnnotation: (callback, point) ->
        editor = atom.workspace.getActiveTextEditor()
        assetDirectory = @_getAssetDirectoryForEditor(editor)
        if not assetDirectory?
            assetDirectory = @_initAssetDirectory(editor)
            @_initEditor(editor, editor.getPath())

        dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit (name) =>
            assetManager = @assetManagers[assetDirectory.getPath()]
            if assetManager.has(name) and Config.showReplaceConfirmDialog
                if not Utils.confirm({message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name)})
                    return @
            callback.call(@, editor, point, name, assetManager)
            return @
        return @

    addCodeAnnotationWithFile: (editor, point, name, assetManager) ->
        paths = Utils.chooseFile("Now, choose an asset.")
        if not paths? or not paths.length
            return @
        assetManager.set(name, paths[0])
            .save()
        @_createNewCodeAnnotation(editor, point, name, assetManager, paths[0])
        return @

    addCodeAnnotationWithContent: (editor, point, name, assetManager) ->
        assetManager.createFromName(name)
            .save()
        codeAnnotation = @_createNewCodeAnnotation(editor, point, name, assetManager)
        codeAnnotation.edit()
        return @

    deleteCodeAnnotation: (point) ->
        editor = atom.workspace.getActiveTextEditor()
        codeAnnotation = @_getCodeAnnotationAtPoint(editor, point)

        if not codeAnnotation?
            atom.notifications.addInfo("There is no code annotation to remove.")
            return @

        if Config.showDeleteConfirmDialog and not Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
            return @

        try
            codeAnnotation.delete()
        catch error
            throw new Error("code-annotations: Could not find a code annotation at the current cursor.")
        return @

    showAll: () ->
        @showAllView.show(@getAllCodeAnnotations())
        return @

    showCommands: () ->
        @showCommandsView.show(["code-annotations:show-commands"])
        return @

    reload: () ->
        @deactivate()
        @activate(@serialize)
        return @

    #######################################################################################
    # PUBLIC

    # grouped by editor paths
    getAllCodeAnnotations: () ->
        annotations = {}
        for editorPath, editorData of @initializedEditors
            annotations[editorPath] = editorData.codeAnnotations
        return annotations

    # API method for plugin packages to register their own renderers for file types
    registerRenderer: (rendererClass) ->
        if rendererClass in @renderers
            throw new Error("The AssetRenderer is already defined to file type '#{rendererClass.fileExtension}'.")
        if not rendererClass.isSubclassOf AssetRenderer
            throw new Error("Invalid asset renderer. Expected a subclass of AssetRenderer.")
        @renderers.push rendererClass
        return @

    showContainer: (codeAnnotation, renderedContent) ->
        @codeAnnotationContainer.setCodeAnnotation(codeAnnotation)
            .setContent(renderedContent)
            .show()
        return @

    hideContainer: () ->
        @codeAnnotationContainer.hide()
        return @

    loadCurrentEditor: () ->
        editor = atom.workspace.getActiveTextEditor()
        path = editor.getPath()
        # initialize if not already done so AND if the editor's grammar has support for code annotations
        if (not @initializedEditors[path]? or @initializedEditors[path].editor isnt editor) and not @ignoredEditors[path]?
            try
                @_initEditor editor, path
            catch error
                # NOTE: must not throw error here because otherwise the editor switch will be interrupted
                console.error("code-annotations: Error while initializing the editor with path '#{editor.getPath()}'.", error.message)
        return @

    #######################################################################################
    # PRIVATE

    _init: () ->
        for dir in atom.project.getDirectories()
            subdir = dir.getSubdirectory(CodeAnnotations.ASSET_DIR_NAME)
            if subdir.existsSync()
                @assetDirectories.push subdir

        try
            @_registerElements()
        catch error
            atom.notifications.addInfo("Custom DOM elements already registered")

        @_registerCommands()
        @_loadAssetManagers()
        @_registerRenderers()
        # @codeAnnotationContainer.addRendererButtons()

        if not Config.manuallyLoadCodeAnnotations
            atom.workspace.observeActivePaneItem (editor) =>
                @codeAnnotationContainer.hide()
                if editor instanceof TextEditor
                    path = editor.getPath()
                    # initialize if not already done so AND if the editor's grammar has support for code annotations
                    if (not @initializedEditors[path]? or @initializedEditors[path].editor isnt editor) and not @ignoredEditors[path]?
                        try
                            @_initEditor editor, path
                        catch error
                            # must not throw error here because otherwise the editor switch will be interrupted
                            console.error("code-annotations: Error while initializing the editor with path '#{editor.getPath()}'.", error.message, error.stack)
                return @
        return @

    # this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor: (editor, editorPath) ->
        assetDirectory = @_getAssetDirectoryForEditor(editor)
        # no asset directory => no .code-annotations folder => nothing to do anyways
        if not assetDirectory?
            return @

        grammar = editor.getGrammar()
        try
            regex = @_getAnnotationRegex(grammar)
            console.log regex
        # comments not supported => do not modify editor
        catch error
            @ignoredEditors[editorPath] = editor
            console.log "unsupported grammer (no comments available => thus no annotations). error: #{error.message}", editor
            return @

        console.log "initializing editor w/ path: #{editorPath}"
        gutter = editor.addGutter({
            name: CodeAnnotations.GUTTER_NAME
            priority: Config.gutterPriority
            visible: true
        })
        ranges = []
        assetData = []

        editor.scan regex, ({match, matchText, range}) ->
            assetData.push {
                line: editor.lineTextForBufferRow(range.start.row)
                name: match[2].trim()
            }
            ranges.push range
            return true

        assetManager = @assetManagers[assetDirectory.getPath()]
        codeAnnotations = []
        for range, i in ranges
            marker = editor.markBufferRange(range)
            try
                codeAnnotation = new CodeAnnotation(
                    @
                    {editor, marker, gutter}
                    {
                        assetManager
                        assetDirectory
                        name: assetData[i].name
                        line: assetData[i].line
                    }
                    @fallbackRenderer
                )
                codeAnnotations.push codeAnnotation
            catch error
                atom.notifications.addError("Could not load code annotation.", {
                    detail: error.message
                })
                console.error error.message

        # TODO: what happens if a TextEditor's file is moved into another project (with another code-annotations folder)??
        # when an editor is renamed the data must be associated with the editor's new path
        # TODO: dispose the handler when deactivating
        editor.onDidChangePath () =>
            newEditorPath = editor.getPath()
            @initializedEditors[newEditorPath] = @initializedEditors[editorPath]
            delete @initializedEditors[editorPath]
            editorPath = newEditorPath
            return @

        @initializedEditors[editorPath] = {
            assetDirectory
            assetManager
            codeAnnotations
            editor
            gutter
        }
        return @

    _registerRenderers: () ->
        for name, config of Config.configData.renderers.properties when Config[name] is true
            @registerRenderer(Renderers[name.slice(4)])
        return @

    _initAssetDirectory: (editor) ->
        editorPath = editor.getPath()
        for directory in atom.project.getDirectories() when directory.contains(editorPath)
            assetDirectory = directory.getSubdirectory(CodeAnnotations.ASSET_DIR_NAME)
            assetDirectoryPath = assetDirectory.getPath()
            Utils.createDirectory(assetDirectoryPath)
            Utils.createFile([assetDirectoryPath, CodeAnnotations.ASSET_NAMES_FILE], "{}")
            @assetDirectories.push(assetDirectory)
            @assetManagers[assetDirectoryPath] = new AssetManager(assetDirectoryPath)
        return assetDirectory

    # get the name of the codeAnnotation at the given point
    _getCodeAnnotationAtPoint: (editor, point) ->
        for codeAnnotation in @_getEditorData(editor).codeAnnotations
            if codeAnnotation.marker.getBufferRange().start.row is point.row
                return codeAnnotation
        return null

    # takes care of removing the unnecessary stuff (i.e. dom nodes)
    # i guess all refs to this singleton are also disposed so everything else will be cleared from memory as well
    _destroyGutters: () ->
        for editorPath, editorData of @initializedEditors
            Utils.getGutterWithName(editorData.editor, CodeAnnotations.GUTTER_NAME).destroy()
        return @

    _loadAssetManagers: () ->
        for assetDirectory in @assetDirectories
            path = assetDirectory.getPath()
            @assetManagers[path] = new AssetManager(path)
        return @

    _getAssetDirectoryForEditor: (editor) ->
        editorPath = editor.getPath()
        # return from "cache"
        if @initializedEditors[editorPath]?.assetDirectory?
            return @initializedEditors[editorPath].assetDirectory
        # actually find the dir
        for assetDirectory in @assetDirectories
            projectRoot = assetDirectory.getParent()
            if projectRoot.contains(editorPath)
                return assetDirectory
        # # found no asset directory => maybe there is non yet => check in all projects
        # throw new Error("Cannot add a code annotation to files outside of the current projects.")
        return null

    _getEditorData: (editor) ->
        return @initializedEditors[editor.getPath()] or null

    _registerCommands: () ->
        @commands =
            'code-annotations:add-code-annotation-with-file': () =>
                return @addCodeAnnotation(
                    @addCodeAnnotationWithFile
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            'code-annotations:add-code-annotation-with-content': () =>
                return @addCodeAnnotation(
                    @addCodeAnnotationWithContent
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            'code-annotations:delete-code-annotation': () =>
                return @deleteCodeAnnotation(atom.workspace.getActiveTextEditor().getCursorBufferPosition())
            'code-annotations:show-all': () =>
                return @showAll()
            'code-annotations:show-commands': () =>
                return @showCommands()
            'code-annotations:reload': () =>
                return @reload()
            'code-annotations:load-current-editor': () =>
                return @loadCurrentEditor()
            'code-annotations:hide-container': (event) =>
                # make the event continue bubble upward
                event.abortKeyBinding()
                return @hideContainer()
        @subscriptions.add atom.commands.add('atom-workspace', @commands)
        return @

    _registerElements: () ->
        document.registerElement "code-annotation", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        }
        document.registerElement "code-annotation-gutter-icon", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        }
        document.registerElement "code-annotation-container", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        }
        return @

    ###
    # Creates an entirely new code annotation.
    # Therefore, an asset is copied and the .names.cson is updated.
    # @param Object assetManager Equals this.assetManagers[current editor's asset path].
    ###
    _createNewCodeAnnotation: (editor, point, name, assetManager) ->
        indentation = editor.indentationForBufferRow(point.row)
        range = [[point.row, 0], [point.row, 0]]
        line = "#{CodeAnnotations.CODE_KEYWORD.trim()} #{name}\n"
        editor.setTextInBufferRange(range, line)
        # make it a comment
        editor.setSelectedBufferRange(range)
        editor.toggleLineCommentsInSelection()
        # make sure it's indented correctly
        editor.setIndentationForBufferRow(point.row, indentation)
        editor.setCursorBufferPosition([point.row, line.length - 1])

        editorData = @_getEditorData(editor)
        if not editorData?
            @_initEditor(editor)

        line = editor.lineTextForBufferRow(point.row)
        # correct range to end of line
        range = [range[0], [point.row, line.length]]

        marker = editor.markBufferRange(range)
        try
            codeAnnotation = new CodeAnnotation(
                @
                {editor, marker, gutter: editorData.gutter}
                {assetManager, assetDirectory: editorData.assetDirectory, name, line}
                @fallbackRenderer
            )
            editorData.codeAnnotations.push codeAnnotation
            return codeAnnotation
        catch error
            codeAnnotation = null
            atom.notifications.addError("Could not load code annotation.", {
                detail: error.message
            })
            console.error error.message, error.stack
        return codeAnnotation

    _getAnnotationRegex: (grammar) ->
        if @annotationRegexCache[grammar.name]?
            return @annotationRegexCache[grammar.name]

        patternData = CommentCharacters.format(CommentCharacters[grammar.name])
        if patternData?
            @annotationRegexCache[grammar.name] = new RegExp(
                "(#{CodeAnnotations.SINGLE_LINE_WHITESPACE_REGEX_STR}#{patternData.begin})" +
                CodeAnnotations.CODE_KEYWORD +
                # name must begin with word character (like most common identifiers)
                "(\\w+.*)" +
                "(#{patternData.end})",
                "g"
            )
            return @annotationRegexCache[grammar.name]
        # ...some grammars don't have comments (e.g. JSON)
        throw new Error("Could not find how to create comments for grammar '#{grammar.name}'.")
