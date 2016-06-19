{CompositeDisposable, Directory, Range} = require 'atom'
# $ = jQuery = require 'jquery'

CodeAnnotation = require './code-annotation'
CodeAnnotationsContainer = require './code-annotations-container'
# AssetRenderer = require './asset-renderers/asset-renderer'
# ImageRenderer = require './asset-renderers/image-renderer'
{AssetRenderer, HtmlRenderer, ImageRenderer, TextRenderer} = require './asset-renderers/all-renderers'

# TODO: make KEYWORD language independent
KEYWORD = "# CODE-ANNOTATION:"

module.exports = CodeAnnotations =

    codeAnnotationsView: null
    modalPanel: null
    subscriptions: null
    renderers: []
    codeAnnotations: []

    #######################################################################################
    # PUBLIC (ATOM API)

    activate: (state) ->
        console.log "ACTIVATING CODE-ANNOTATIONS"
        @_registerElements()

        # add default renderers
        @registerRenderer(ImageRenderer)
        @registerRenderer(HtmlRenderer)
        @registerRenderer(TextRenderer)
        # TODO: enable more than 1 directory
        @assetDirectory = new Directory("#{atom.project.getDirectories()[0].path}/.code-annotations", false)

        editor = atom.workspace.getActiveTextEditor()
        editorView = atom.views.getView(editor)
        @gutter = editor.addGutter({
            name: "code-annotations"
            priority: 100
            visible: true
        })

        @container = new CodeAnnotationsContainer()
        editorView.shadowRoot.appendChild @container.getElement()

        # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        @subscriptions = new CompositeDisposable()

        # Register command that toggles this view
        @subscriptions.add atom.commands.add 'atom-workspace', {
            'code-annotations:toggle': () =>
                return @toggle()
            'code-annotations:add-code-annotation': () =>
                return @addCodeAnnotation()
        }

    deactivate: () ->
        @modalPanel.destroy()
        @subscriptions.dispose()
        @codeAnnotationsView.destroy()
        return @

    serialize: () ->
        return {}

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

    addCodeAnnotation: () ->
        editor = atom.workspace.getActiveTextEditor()
        cursorPos = editor.getCursorBufferPosition()
        console.log "here we are"
        # make the user choose an asset
        dialog = (require "remote").require "dialog"
        paths = dialog.showOpenDialog({properties: ['openFile']})
        if not paths?
            atom.notifications.addError("No asset chosen")
            return @

        # TODO
        editor.insertText()
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
            colIdx = line.indexOf(KEYWORD)
            if (colIdx > 0 and whitespaceRegexp.test(line.slice(0, colIdx)) is true) or colIdx is 0
                ranges.push new Range([rowIdx, colIdx], [rowIdx, line.length])
                assetData.push {
                    name: line.slice(colIdx + KEYWORD.length).trim()
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

    showRendered: (renderedContent) ->
        @container.empty().append(renderedContent).show()
        return @

    hideRendered: (renderedContent) ->
        @container.hide()
        return @

    #######################################################################################
    # PRIVATE

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
