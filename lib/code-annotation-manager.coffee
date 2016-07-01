{CompositeDisposable, Directory, Range, TextEditor} = require "atom"
CSON = require "season"
libpath = require "path"
# $ = jQuery = require "jquery"
# {$, jQuery, TextEditorView, View} = require "atom-space-pen-views"

CodeAnnotations = require "./constants"
config = require "./settings"
Utils = require "./utils"

CodeAnnotation = require "./code-annotation"
CodeAnnotationContainer = require "./code-annotation-container"
{AssetRenderer, HtmlRenderer, ImageRenderer, TextRenderer} = require "./asset-renderers/all-renderers"
Dialog = require "./dialog.coffee"
CodeAnnotationNameDialog = require "./asset-name-dialog.coffee"



###
@class CodeAnnotationManager
Has a CodeAnnotationContainer which contains the output of an asset renderer.
###
module.exports = CodeAnnotationManager =
    config: config

    subscriptions: null
    renderers: []
    codeAnnotations: []
    renderer: null
    currentCodeAnnotation: null

    #######################################################################################
    # PUBLIC (ATOM API)

    activate: (state) ->
        console.log "ACTIVATING CODE-ANNOTATIONS"
        # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        @subscriptions = new CompositeDisposable()
        # TODO: enable more than 1 directory
        # this.project.resolvePath(uri) ?
        @assetDirectories = []
        @assetDirectory = null
        @initializedEditors = {}

        @_init()

        # editor = atom.workspace.getActiveTextEditor()
        # editorView = atom.views.getView(editor)
        # @gutter = editor.addGutter({
        #     name: "code-annotations"
        #     priority: 100
        #     visible: true
        # })
        # @container = new CodeAnnotationContainer(@)
        # editorView.shadowRoot.appendChild @container.getElement()

    deactivate: () ->
        @subscriptions.dispose()
        return @

    serialize: () ->
        return {}

    #######################################################################################
    # PUBLIC

    loadAssetNames: () ->
        assetNames = {}
        for assetDirectory in @assetDirectories
            path = assetDirectory.getPath()
            assetNames[path] = CSON.readFileSync(path + "/.names.cson")
        @assetNames = assetNames
        console.log @assetNames
        return @


    # API method for plugin packages to register their own renderers for file types
    registerRenderer: (rendererClass) ->
        if rendererClass in @renderers
            throw new Error("The AssetRenderer is already defined to file type '#{rendererClass.fileExtension}'.")
        if not rendererClass.isSubclassOf AssetRenderer
            throw new Error("Invalid asset renderer. Expected a subclass of AssetRenderer.")
        @renderers.push rendererClass
        return @

    addCodeAnnotation: () ->
        dialog = new CodeAnnotationNameDialog()
        dialog.attach().onSubmit (name) =>
            editor = atom.workspace.getActiveTextEditor()
            assetNamesForProject = @assetNames[@_getAssetDirectoryForEditor(editor).getPath()]
            if assetNamesForProject?[name]? and not confirm("Asset with name '#{name}' already exists. Replace it?")
                return @
            @_createCodeAnnotation(editor, name, assetNamesForProject)
            return @
        console.log dialog
        return @

    # CODE-ANNOTATION: image-testasset.png
    # CODE-ANNOTATION: html-testasset.html
    # CODE-ANNOTATION: text-testasset.txt
    # toggle: () ->
    #     # TODO: move marker/decoration code to activate method and toggle gutter visibility only
    #     editor = atom.workspace.getActiveTextEditor()
    #     text = editor.getText()
    #     lines = text.split(/\n/g)
    #     whitespaceRegexp = /^\s*$/
    #     ranges = []
    #     assetData = []
    #     for line, rowIdx in lines
    #         # colIdx = line.indexOf(KEYWORD)
    #         colIdx = line.indexOf(CodeAnnotations.CODE_KEYWORD)
    #         if (colIdx > 0 and whitespaceRegexp.test(line.slice(0, colIdx)) is true) or colIdx is 0
    #             ranges.push new Range([rowIdx, colIdx], [rowIdx, line.length])
    #             assetData.push {
    #                 # name: line.slice(colIdx + KEYWORD.length).trim()
    #                 name: line.slice(colIdx + CodeAnnotations.CODE_KEYWORD.length).trim()
    #             }
    #
    #     markers = []
    #     decorations = []
    #     for range, i in ranges
    #         marker = editor.markBufferRange(range)
    #         markers.push marker
    #         icon = @_createGutterIcon()
    #         decoration = @gutter.decorateMarker(marker, {
    #             item: icon
    #         })
    #         decorations.push decoration
    #
    #         codeAnnotation = new CodeAnnotation(@, marker, decoration, icon, assetData[i])
    #         @codeAnnotations.push codeAnnotation
    #     return true

    showContainer: (editor, renderedContent) ->
        {container} = @initializedEditors[editor.getPath()]
        if container?
            container.empty()
                .append(renderedContent)
                .show()
            return @
        throw new Error("No container found")

    hideContainer: (editor) ->
        {container} = @initializedEditors[editor.getPath()]
        if container?
            container.hide()
            return @
        throw new Error("No container found")

    setCurrentCodeAnnotation: (codeAnnotation) ->
        @currentCodeAnnotation = codeAnnotation
        return @

    getCurrentCodeAnnotation: () ->
        return @currentCodeAnnotation

    # get current renderer (contained in the CodeAnnotationContainer)
    getRenderer: () ->
        return @currentCodeAnnotation.getRenderer()

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

        @_registerCommands()
        @_registerElements()
        @loadAssetNames()

        # add default renderers
        @registerRenderer(ImageRenderer)
        @registerRenderer(HtmlRenderer)
        @registerRenderer(TextRenderer)

        atom.workspace.observeActivePaneItem (editor) =>
            if editor instanceof TextEditor
                # console.log 'observeActivePaneItem: ', editor
                if not @initializedEditors[editor.getPath()]?
                    @_initEditor editor
            return @

    # this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor: (editor) ->
        console.log "initializing editor w/ path: #{editor.getPath()}"
        editorView = atom.views.getView(editor)
        gutter = editor.addGutter({
            name: "code-annotations"
            priority: 100
            visible: true
        })

        container = new CodeAnnotationContainer(@)
        editorView.shadowRoot.appendChild container.getElement()

        text = editor.getText()
        lines = text.split(/\n/g)
        whitespaceRegexp = /^\s*$/
        ranges = []
        assetData = []
        for line, rowIdx in lines
            colIdx = line.indexOf(CodeAnnotations.CODE_KEYWORD)
            if (colIdx > 0 and whitespaceRegexp.test(line.slice(0, colIdx)) is true) or colIdx is 0
                ranges.push new Range([rowIdx, colIdx], [rowIdx, line.length])
                assetData.push {
                    name: line.slice(colIdx + CodeAnnotations.CODE_KEYWORD.length).trim()
                }

        codeAnnotations = []
        for range, i in ranges
            marker = editor.markBufferRange(range)
            icon = @_createGutterIcon()
            decoration = gutter.decorateMarker(marker, {
                item: icon
            })
            codeAnnotation = new CodeAnnotation(@, marker, decoration, icon, assetData[i])
            codeAnnotations.push codeAnnotation

        @initializedEditors[editor.getPath()] =
            instance: editor
            container: container
            gutter: gutter
            codeAnnotations: codeAnnotations
            assetDirectory: @_getAssetDirectoryForEditor(editor)
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

    _registerCommands: () ->
        @subscriptions.add atom.commands.add 'atom-workspace', {
            'code-annotations:add-code-annotation': () =>
                return @addCodeAnnotation()
            'code-annotations:hide-container': () =>
                return @hideContainer()
        }
        return @

    _registerElements: () ->
        document.registerElement("code-annotation-gutter-icon", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        })
        document.registerElement("code-annotation", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        })
        return @

    _createGutterIcon: () ->
        gutterIcon = document.createElement("code-annotation-gutter-icon")
        # item.className = ""
        return gutterIcon

    ###
    # @param Object assetNames Equals this.assetNames[current editor's asset path].
    ###
    _createCodeAnnotation: (editor, name, assetNames) ->
        # editor = atom.workspace.getActiveTextEditor()
        # cursorPos = editor.getCursorBufferPosition()
        # console.log "here we are"
        # # make the user choose an asset
        # dialog = (require "remote").require "dialog"
        # paths = dialog.showOpenDialog({properties: ['openFile']})
        paths = Utils.chooseFile("Now, choose an asset.")
        if not paths?
            atom.notifications.addError("No asset chosen.")
            return @
        assetPath = paths[0]
        console.log name, assetPath
        # add asset name
        # assetsPath = @_getAssetDirectoryForEditor(editor).getPath()
        # assetNames[name] = libpath.relative(assetsPath, assetPath)
        assetNames[name] = libpath.basename(assetPath)
        CSON.writeFileSync(@_getAssetDirectoryForEditor(editor).getPath() + "/.names.cson", assetNames)

        # if not paths.length > 1
        #     atom.notifications.addError("Can only choose 1 file for a code annotation.")
        #     return @
        # TODO
        # editor.insertText()
