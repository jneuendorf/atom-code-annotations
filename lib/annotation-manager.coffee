{CompositeDisposable, Directory, File, Range, TextEditor} = require "atom"

CommentCharacters = require "./comment-characters"
CodeAnnotations = require "./constants"
Config = require "./config"
Utils = require "./utils"

AssetManager = require "./asset-manager"
Annotation = require "./annotation"
Renderers = {AssetRenderer} = require "./asset-renderers/all-renderers"

ShowAllView = require "./views/show-all-view"
ShowCommandsView = require "./views/show-commands-view"
CodeAnnotationContainer = require "./views/annotation-container"
CodeAnnotationNameDialog = require "./views/asset-name-dialog"


module.exports =
    config: Config.configData

    # INSTANCE PROPERTIES
    # commands:                 Object(String, Function)
    # subscriptions:            CompositeDisposable
    # rendererClasses:          Array of AssetRenderer
    # annotationRegexCache:     Object(String, RegExp)
    # assetManagers:            Object(String, AssetManager)
    # assetDirectories:         Array of Directory
    # initializedEditors:       Object(String, TextEditor
    # codeAnnotationContainer:  CodeAnnotationContainer
    # ignoredEditors:           Object(String, TextEditor)
    # fallbackRenderer:         AssetRenderer
    # showAllView               ShowAllView

    #######################################################################################
    # PUBLIC (ATOM API)

    activate: (state) ->
        # console.log "could deserialize:", state
        # those are set in the constructor of the CodeAnnotationContainer
        @textColor = null
        @backgroundColor = null

        @commands = null
        @subscriptions = new CompositeDisposable()
        @rendererClasses = []
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
    # PUBLIC (services)

    # API method for plugin packages to register their own renderers for file types
    registerRenderer: (rendererClass) ->
        adjustedRendererClass = AssetRenderer.ensureSameApi(rendererClass)
        if not adjustedRendererClass?
            throw new Error("Invalid asset renderer '#{rendererClass.getName?() or rendererClass.name}'. Expected a subclass of AssetRenderer or a class that has an equivalent API.")
        # console.log "registering #{adjustedRendererClass.getName()}"
        @rendererClasses.push adjustedRendererClass
        return @

    #######################################################################################
    # PUBLIC (associated with commands)

    # CODE-ANNOTATION: image-testasset
    # CODE-ANNOTATION: inline-html-testasset
    # CODE-ANNOTATION: html-testasset
    # CODE-ANNOTATION: text-testasset
    # CODE-ANNOTATION: url-testasset

    addAnnotation: (callback, point) ->
        editor = atom.workspace.getActiveTextEditor()
        assetDirectory = @_getAssetDirectoryForEditor(editor)
        if not assetDirectory?
            assetDirectory = @_initAssetDirectory(editor)
            @_initEditor(editor, editor.getPath())

        dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit (name) =>
            assetManager = @assetManagers[assetDirectory.getPath()]
            # TODO: make is possible to reference an existing annotation
            if assetManager.has(name) and Config.showReplaceConfirmDialog
                buttons = ["Replace", "Reference", "Cancel"]
                choice = buttons[atom.confirm({
                    message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name)
                    buttons
                })]
                switch choice
                    when "Cancel"
                        return @
                    when "Reference"
                        return @addExistingCodeAnnotation(editor, point, name, assetManager)
                    # when "Replace" then continue
            callback.call(@, editor, point, name, assetManager)
            return @
        return @

    addAnnotationWithFile: (editor, point, name, assetManager) ->
        paths = Utils.chooseFile("Now, choose an asset.")
        if not paths? or not paths.length
            return @
        assetManager.set(name, paths[0])
            .save()
        annotation = @_createNewAnnotation(editor, point, name, assetManager)
        # cleanup the created files
        if not annotation?
            assetManager.delete(name)
                .save()
            throw new Error("Could not add code annotation. Please report this bug!")
        return @

    addAnnotationWithContent: (editor, point, name, assetManager) ->
        assetManager.createFromName(name)
            .save()
        annotation = @_createNewAnnotation(editor, point, name, assetManager)
        if annotation?
            annotation.edit()
        # cleanup the created files
        else
            assetManager.delete(name)
                .save()
            throw new Error("Could not add code annotation. Please report this bug!")
        return @

    addExistingCodeAnnotation: (editor, point, name, assetManager) ->
        @_createNewAnnotation(editor, point, name, assetManager)
        return @

    deleteAnnotation: (point) ->
        editor = atom.workspace.getActiveTextEditor()
        annotation = @_getCodeAnnotationAtPoint(editor, point)

        if not annotation?
            atom.notifications.addInfo("There is no code annotation to remove.")
            return @

        if Config.showDeleteConfirmDialog and not Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
            return @

        try
            annotation.delete()
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
            annotations[editorPath] = editorData.annotations
        return annotations

    showContainer: (annotation, renderedContent) ->
        @codeAnnotationContainer.setCodeAnnotation(annotation)
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
            atom.notifications.addInfo("Custom DOM elements already registered.")

        @_registerCommands()
        @_loadAssetManagers()
        @_registerRenderers()

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
        # comments not supported => do not modify editor
        catch error
            @ignoredEditors[editorPath] = editor
            console.log "unsupported grammer (no comments available => thus no annotations). error: #{error.message}", editorPath
            return @

        # console.log "initializing editor w/ path: #{editorPath}"
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
        annotations = []
        for range, i in ranges
            marker = @_createAnnotationMarker(editor, range)
            annotation = @_instantiateCodeAnnotation(
                {editor, marker, gutter}
                {
                    assetManager
                    assetDirectory
                    name: assetData[i].name
                    line: assetData[i].line
                }
            )
            if annotation?
                annotations.push annotation

        # support renaming open editors' files - changing unopen files won't be listened to
        @subscriptions.add editor.onDidChangePath () =>
            @_onDidChangeEditorPath(editor, editorPath)
            editorPath = editor.getPath()
            return true

        @subscriptions.add editor.onDidDestroy () =>
            delete @initializedEditors[editorPath]
            return @

        @initializedEditors[editorPath] = {
            assetDirectory
            assetManager
            annotations
            editor
            gutter
        }
        return @

    _uninitEditor: (editor, editorPath) ->
        if @initializedEditors[editorPath]?
            for annotation in @initializedEditors[editorPath].annotations
                annotation.destroy()
            Utils.getGutterWithName(editor, CodeAnnotations.GUTTER_NAME).destroy()
            delete @initializedEditors[editorPath]
        return @

    _reinitializeEditor: (editor, editorPath) ->
        return @_uninitEditor(editor, editorPath)._initEditor(editor, editorPath)

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

    # get the name of the annotation at the given point
    _getCodeAnnotationAtPoint: (editor, point) ->
        for annotation in @_getEditorData(editor).annotations
            if annotation.marker.getBufferRange().start.row is point.row
                return annotation
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

    _getAssetDirectoryForEditor: (editor, useCache = true) ->
        editorPath = editor.getPath()
        # return from "cache"
        if @initializedEditors[editorPath]?.assetDirectory? and useCache
            return @initializedEditors[editorPath].assetDirectory
        # actually find the dir
        for assetDirectory in @assetDirectories
            projectRoot = assetDirectory.getParent()
            if projectRoot.contains(editorPath)
                return assetDirectory
        # # found no asset directory => maybe there is non yet => check in all projects
        # throw new Error("Cannot add a code annotation to files outside of the current projects.")
        return null

    _onDidChangeEditorPath: (editor, oldEditorPath) ->
        newEditorPath = editor.getPath()
        newAssetDirectory = @_getAssetDirectoryForEditor(editor, false)
        oldEditorData = @initializedEditors[oldEditorPath]

        # editor has been moved within the same project folder => just update key of @initializedEditors
        if newAssetDirectory?.getPath() is oldEditorData.assetDirectory.getPath()
            delete @initializedEditors[oldEditorPath]
            @initializedEditors[newEditorPath] = oldEditorData
            oldEditorPath = newEditorPath
            return @

        # editor has been moved into another project folder
        # no .code-annotations directory => create it or stop right here
        if not newAssetDirectory?
            newAssetDirectory = @_initAssetDirectory(editor)

        # move asset files to new assetDirectory and update according references
        newAssetManager = @assetManagers[newAssetDirectory.getPath()]
        for annotation in oldEditorData.annotations
            name = annotation.name
            if newAssetManager.has(name)
                if Config.showReplaceConfirmDialog
                    if not Utils.confirm({message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name)})
                        continue
                newAssetManager.delete(name)
            assetManager.move(name, newAssetManager)

        @_reinitializeEditor(editor, editorPath)
        return @

    _getEditorData: (editor) ->
        return @initializedEditors[editor.getPath()] or null

    _registerCommands: () ->
        @commands =
            'code-annotations:add-annotation-with-file': () =>
                return @addAnnotation(
                    @addAnnotationWithFile
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            'code-annotations:add-annotation-with-content': () =>
                return @addAnnotation(
                    @addAnnotationWithContent
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            'code-annotations:add-existing-annotation': () =>
                return @addAnnotation(
                    @addExistingCodeAnnotation
                    atom.workspace.getActiveTextEditor().getCursorBufferPosition()
                )
            'code-annotations:delete-annotation': () =>
                return @deleteAnnotation(atom.workspace.getActiveTextEditor().getCursorBufferPosition())
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

    _createAnnotationMarker: (editor, range) ->
        marker = editor.markBufferRange(range, {invalidate: "surround"})
        marker.setProperties {
            originalText: editor.getTextInBufferRange(range).trim()
        }
        @subscriptions.add marker.onDidChange (event) =>
            properties = marker.getProperties()
            if event.textChanged
                currentRange = marker.getBufferRange()
                markerText = editor.getTextInBufferRange(currentRange).trim()
                annotation = properties.annotation
                if markerText.length > 0
                    # non-whitespace text changes => custom invalidate
                    if properties.originalText isnt markerText
                        annotation.invalidate()
                    # changed text back to oringal => it's valid again
                    else
                        annotation.validate()
                else
                    editorData = @initializedEditors[editor.getPath()]
                    editorData.annotations = (a for a in editorData.annotations when a isnt annotation)
                    if Config.showDeleteConfirmDialog and Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
                        annotation.delete(false)
                    else
                        annotation.destroy()
            return @
        return marker

    ###
    # Creates an entirely new code annotation.
    # Therefore, an asset is copied and the .names.cson is updated.
    # @param Object assetManager Equals this.assetManagers[current editor's asset path].
    ###
    _createNewAnnotation: (editor, point, name, assetManager) ->
        editorData = @_getEditorData(editor)
        if not editorData?
            throw new Error("The editor with path '#{editor.getPath()}' has not been initialized but it should. Please report this bug!")

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

        line = editor.lineTextForBufferRow(point.row)
        # correct range to end of line
        range = [range[0], [point.row, line.length]]
        marker = @_createAnnotationMarker(editor, range)

        annotation = @_instantiateCodeAnnotation(
            {editor, marker, gutter: editorData.gutter}
            {assetManager, assetDirectory: editorData.assetDirectory, name, line}
        )
        if annotation?
            editorData.annotations.push annotation
        return annotation

    _instantiateCodeAnnotation: (editorData, assetData) ->
        try
            annotation = new Annotation(@, editorData, assetData, @fallbackRenderer)
        catch error
            annotation = null
            atom.notifications.addError("Could not instantiate code annotation.", {
                detail: error.message
                dismissable: true
            })
            console.error error, assetData
        return annotation

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
