{CompositeDisposable, Directory, Range, TextEditor} = require "atom"
CSON = require "season"
# $ = jQuery = require "jquery"
# {$, jQuery, TextEditorView, View} = require "atom-space-pen-views"
Utils = require "./utils"
CodeAnnotation = require "./code-annotation"
CodeAnnotationContainer = require "./code-annotation-container"
{AssetRenderer, HtmlRenderer, ImageRenderer, TextRenderer} = require "./asset-renderers/all-renderers"
Dialog = require "./dialog.coffee"
CodeAnnotationNameDialog = require "./asset-name-dialog.coffee"
CodeAnnotations = require "./constants"



###
@class CodeAnnotationManager
Has a CodeAnnotationContainer which contains the output of an asset renderer.
###
module.exports = CodeAnnotationManager =

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
        @initializedEditors = []

        @_init()

        editor = atom.workspace.getActiveTextEditor()
        editorView = atom.views.getView(editor)
        @gutter = editor.addGutter({
            name: "code-annotations"
            priority: 100
            visible: true
        })

        @container = new CodeAnnotationContainer(@)
        editorView.shadowRoot.appendChild @container.getElement()

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
            @_createCodeAnnotationWithName(name)
            return @
        console.log dialog
        return @

    # CODE-ANNOTATION: image-testasset.png
    # CODE-ANNOTATION: html-testasset.html
    # CODE-ANNOTATION: text-testasset.txt
    toggle: () ->
        # TODO: move marker/decoration code to activate method and toggle gutter visibility only
        editor = atom.workspace.getActiveTextEditor()
        text = editor.getText()
        lines = text.split(/\n/g)
        whitespaceRegexp = /^\s*$/
        ranges = []
        assetData = []
        for line, rowIdx in lines
            # colIdx = line.indexOf(KEYWORD)
            colIdx = line.indexOf(CodeAnnotations.CODE_KEYWORD)
            if (colIdx > 0 and whitespaceRegexp.test(line.slice(0, colIdx)) is true) or colIdx is 0
                ranges.push new Range([rowIdx, colIdx], [rowIdx, line.length])
                assetData.push {
                    # name: line.slice(colIdx + KEYWORD.length).trim()
                    name: line.slice(colIdx + CodeAnnotations.CODE_KEYWORD.length).trim()
                }

        markers = []
        decorations = []
        for range, i in ranges
            marker = editor.markBufferRange(range)
            markers.push marker
            icon = @_createGutterIcon()
            decoration = @gutter.decorateMarker(marker, {
                item: icon
            })
            decorations.push decoration

            codeAnnotation = new CodeAnnotation(@, marker, decoration, icon, assetData[i])
            @codeAnnotations.push codeAnnotation
        return true

    showContainer: (renderedContent) ->
        @container.empty()
            .append(renderedContent)
            .show()
        return @

    hideContainer: () ->
        @container.hide()
        return @

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
                console.log 'observeActivePaneItem: ', editor
                if editor not in @initializedEditors
                    @_initEditor editor
            return @

    # this method loads all the data necessary for displaying code annotations and displays the gutter icons for a certain TextEditor
    _initEditor: (editor) ->
        # TODO: how to associate editors to asset paths?
        # editor.getPath()
        @initializedEditors.push editor
        return @

    _registerCommands: () ->
        @subscriptions.add atom.commands.add 'atom-workspace', {
            'code-annotations:toggle': () =>
                return @toggle()
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

    _createCodeAnnotationWithName: (name) ->
        # editor = atom.workspace.getActiveTextEditor()
        # cursorPos = editor.getCursorBufferPosition()
        # console.log "here we are"
        # # make the user choose an asset
        # dialog = (require "remote").require "dialog"
        # paths = dialog.showOpenDialog({properties: ['openFile']})
        paths = Utils.chooseFile("Choose an asset.")
        if not paths?
            atom.notifications.addError("No asset chosen.")
            return @
        # if not paths.length > 1
        #     atom.notifications.addError("Can only choose 1 file for a code annotation.")
        #     return @
        # TODO
        # editor.insertText()
