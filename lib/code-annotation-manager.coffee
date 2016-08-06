{CompositeDisposable, Directory, Range, TextEditor} = require "atom"
CSON = require "season"

CommentCharacters = require "./comment-characters"
CodeAnnotations = require "./constants"
Config = require "./config"
Utils = require "./utils"

AssetManager = require "./asset-manager"
CodeAnnotation = require "./code-annotation"
CodeAnnotationContainer = require "./code-annotation-container"
# {AssetRenderer, HtmlRenderer, ImageRenderer, TextRenderer} = require "./asset-renderers/all-renderers"
Renderers = {AssetRenderer} = require "./asset-renderers/all-renderers"
Dialog = require "./dialog.coffee"
CodeAnnotationNameDialog = require "./asset-name-dialog.coffee"



###
@class CodeAnnotationManager
Has a CodeAnnotationContainer which contains the output of an asset renderer.
###
module.exports = CodeAnnotationManager =
    # this is my awesome annotation
    config: Config.configData

    # INSTANCE PROPERTIES
    # subscriptions:            CompositeDisposable
    # renderers:                Array of AssetRenderer
    # annotationRegexCache:     Dict(String, RegExp)
    # assetManagers: {}
    # assetDirectories: []
    # assetDirectory: null
    # initializedEditors: {}    Dict(String, TextEditor
    # codeAnnotationContainer:  CodeAnnotationContainer
    # ignoredEditors: {}        Dict(String, TextEditor)

    #######################################################################################
    # PUBLIC (ATOM API)

    activate: (state) ->
        @subscriptions = new CompositeDisposable()
        @renderers = []
        @annotationRegexCache = {}
        @assetManagers = {}
        @assetDirectories = []
        @assetDirectory = null
        @initializedEditors = {}
        @ignoredEditors = {}
        @codeAnnotationContainer = null

        @_init()
        return @

    deactivate: () ->
        @subscriptions.dispose()
        @_destroyGutters()
        @_destroyContainer()
        return @

    serialize: () ->
        # NOTE: could return asset manager data for better performance
        # NOTE: after git pull the passed data could then be invalid
        #       -> user must have the possibility to manually reload the asset files
        return {}

    #######################################################################################
    # PUBLIC (associated with commands)

    # CODE-ANNOTATION: image-testasset
    # CODE-ANNOTATION: html-testasset
    # CODE-ANNOTATION: framed-html-testasset
    # CODE-ANNOTATION: text-testasset

    addCodeAnnotationAtLine: (point) ->
        dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit (name) =>
            editor = atom.workspace.getActiveTextEditor()
            assetManager = @assetManagers[@_getAssetDirectoryForEditor(editor).getPath()]
            if assetManager.has(name)
                if Config.showReplaceConfirmDialog and not Utils.confirm({
                    message: CodeAnnotations.REPLACE_CONFIRM_MESSAGE(name)
                })
                    return @
            @_createNewCodeAnnotation(editor, point, name, assetManager)
            return @
        return @

    deleteCodeAnnotationAtLine: (point) ->
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
        # TODO: create search window like cmd+shift+p
        # -> SelectListView
        return @

    reload: () ->
        @deactivate()
        @activate(@serialize)

    #######################################################################################
    # PUBLIC

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

    #######################################################################################
    # PRIVATE

    _init: () ->
        for dir in atom.project.getDirectories()
            subdir = dir.getSubdirectory(CodeAnnotations.ASSET_DIR_NAME)
            if subdir.existsSync()
                @assetDirectories.push subdir
        # @assetDirectory = atom.project.getDirectories()[0].getSubdirectory(".code-annotations")
        @assetDirectory = @assetDirectories[0]
        console.log @assetDirectories

        @codeAnnotationContainer = new CodeAnnotationContainer()
        pane = atom.views.getView(atom.workspace.getActivePane())
        pane.appendChild @codeAnnotationContainer.getElement()

        try
            @_registerElements()
        catch error
            atom.notifications.addInfo("Custom DOM elements already registered")

        @_registerCommands()
        @_loadAssetManagers()
        @_registerRenderers()

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
                        console.error("code-annotations: Error while initializing the editor with path '#{editor.getPath()}'.", error.message)
            return @
        return @

    _registerRenderers: () ->
        for name, config of Config.configData.renderers.properties when Config[name] is true
            @registerRenderer(Renderers[name.slice(4)])
        return @

    # this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor: (editor, editorPath) ->
        grammar = editor.getGrammar()
        try
            regex = @_getAnnotationRegex(grammar)
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
                line: matchText
                name: matchText.slice(matchText.indexOf(CodeAnnotations.CODE_KEYWORD) + CodeAnnotations.CODE_KEYWORD.length).trim()
            }
            ranges.push range
            return true

        assetDirectoryPath = @_getAssetDirectoryForEditor(editor)
        codeAnnotations = []
        for range, i in ranges
            marker = editor.markBufferRange(range)
            codeAnnotation = new CodeAnnotation(
                @
                editor
                marker
                gutter
                assetData[i]
                @assetManagers[assetDirectoryPath.getPath()]
            )
            codeAnnotations.push codeAnnotation

        # TODO: there is not necessarily only 1 editor for 1 path. (e.g. split panes). so for each path there should be a list of unique editors (like a hashmap with editor.getPath() as the hash of the editor)
        # TODO: add editor:path‐changed hook to reinitialize
        @initializedEditors[editorPath] =
            assetDirectory: assetDirectoryPath
            assetManager: @assetManagers[assetDirectoryPath]
            codeAnnotations: codeAnnotations
            # container: container
            editor: editor
            gutter: gutter
        return @

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
        throw new Error("Cannot add a code annotation to files outside of the current projects.")

    _getEditorData: (editor) ->
        return @initializedEditors[editor.getPath()] or null
        # dataList = @initializedEditors[editor.getPath()]
        # if dataList?
        #     for data in dataList when data.editor is editor
        #         return data
        # return {}

    _registerCommands: () ->
        @subscriptions.add atom.commands.add 'atom-workspace', {
            'code-annotations:add-code-annotation-at-line': () =>
                return @addCodeAnnotationAtLine(atom.workspace.getActiveTextEditor().getCursorBufferPosition())
            'code-annotations:delete-code-annotation-at-line': () =>
                return @deleteCodeAnnotationAtLine(atom.workspace.getActiveTextEditor().getCursorBufferPosition())
            # 'code-annotations:hide-container': () =>
            #     return @hideContainer()
            'code-annotations:show-all': () =>
                return @showAll()
            'code-annotations:reload': () =>
                return @reload()
        }
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
        # TODO: enable entering a content and an asset type (i.e. html content without having to create a file 1st)
        paths = Utils.chooseFile("Now, choose an asset.")
        if not paths?
            atom.notifications.addError("No asset chosen.")
            return @
        assetPath = paths[0]
        console.log name, assetPath

        # update asset name "database" (this should not throw errors because the manager should never be null, name collisions were checked before and the manager should never have been initialized with a wrong path (so save should work))
        assetManager
            .set name, assetPath
            .save()

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

        # correct range to end of line
        lineLength = editor.getTextInBufferRange([[point.row, 0], [point.row + 1, 0]]).length - 1
        range = range[0].concat([point.row, lineLength])

        marker = editor.markBufferRange(range)
        editorData.codeAnnotations.push new CodeAnnotation(
            @
            editor
            marker
            editorData.gutter
            {name, line}
            assetManager
        )
        return @

    _getAnnotationRegex: (grammar) ->
        if @annotationRegexCache[grammar.name]?
            return @annotationRegexCache[grammar.name]

        patternData = CommentCharacters.format(CommentCharacters[grammar.name])
        if patternData?
            @annotationRegexCache[grammar.name] = new RegExp(
                CodeAnnotations.SINGLE_LINE_WHITESPACE_REGEX_STR +
                patternData.begin +
                CodeAnnotations.CODE_KEYWORD +
                # must begin with word character (like most common identifiers)
                "\\w+.*" +
                patternData.end,
                "g"
            )
            return @annotationRegexCache[grammar.name]
        # ...some grammars don't have comments (e.g. JSON)
        throw new Error("Could not find a regular expression for grammar '#{grammar.name}'.")
