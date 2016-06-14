CodeAnnotationsView = require './code-annotations-view'
{CompositeDisposable, Range} = require 'atom'
$ = jQuery = require 'jquery'

# class MyRange extends Range
#     constructor: () ->
#         super()
#         @__jim = "sdf"
# console.log(new MyRange())

module.exports = CodeAnnotations =

    codeAnnotationsView: null
    modalPanel: null
    subscriptions: null
    renderers: {}

    activate: (state) ->
        @_registerElements()

        # add association between decoration model and view (aka. view provider)
        # atom.views.addViewProvider CodeAnnotationDecoration, (codeAnnotationDecoration) ->
        #     # codeAnnotationDecorationView = new CodeAnnotationDecorationView()
        #     # codeAnnotationDecorationView.initialize(codeAnnotationDecoration)
        #     # return codeAnnotationDecoration
        #     return undefined

        editor = atom.workspace.getActiveTextEditor()
        @gutter = editor.addGutter({
            name: "code-annotations"
            priority: 100
            visible: true
        })

        @codeAnnotationsView = new CodeAnnotationsView(state.codeAnnotationsViewState)
        @modalPanel = atom.workspace.addModalPanel({
            item: @codeAnnotationsView.getElement(),
            visible: false
        })

        # Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        @subscriptions = new CompositeDisposable()

        # Register command that toggles this view
        @subscriptions.add atom.commands.add('atom-workspace', {
            'code-annotations:toggle': () => @toggle()
        })

    deactivate: () ->
        @modalPanel.destroy()
        @subscriptions.dispose()
        @codeAnnotationsView.destroy()

    serialize: () ->
        return {
            codeAnnotationsViewState: @codeAnnotationsView.serialize()
        }

    # API method for plugin packages to register their own renderers for file types
    registerRendererForFileType: (fileType, renderer) ->
        if typeof fileType isnt "string" or fileType[0] isnt "."
            throw new Error("Invalid file type. Expected string starting with a dot.")
        if @renderers[fileType]?
            throw new Error("An AssetRenderer is already defined to file type '#{fileType}'.")
        if renderer not instanceof AssetRenderer
            throw new Error("Invalid asset renderer. Expected an instance of AssetRenderer.")
        @renderes[fileType] = renderer
        return @

    _decorateMarkerWithButton: (marker) ->

    _registerElements: () ->
        # document.registerElement("code-annotation-decoration", {
        #     prototype: Object.create(HTMLDivElement.prototype)
        #     extends: "span"
        # })
        document.registerElement("code-annotation-gutter-icon", {
            prototype: Object.create(HTMLDivElement.prototype)
            extends: "div"
        })

    # _createCodeAnnotationDecoration: () ->
    #     decoration = document.createElement("code-annotation-decoration")
    #     return decoration

    _createGutterIcon: () ->
        gutterIcon = document.createElement("code-annotation-gutter-icon")
        # item.className = ""
        return gutterIcon

    # CODE-ANNOTATION: asdf
    toggle: () ->
        editor = atom.workspace.getActiveTextEditor()

        # start = performance.now()
        text = editor.getText()
        lines = text.split(/\n/g)
        whitespaceRegexp = /^\s*$/
        ranges = []
        for line, rowIdx in lines
            colIdx = line.indexOf("# CODE-ANNOTATION:")
            if (colIdx > 0 and whitespaceRegexp.test(line.slice(0, colIdx)) is true) or colIdx is 0
                ranges.push new Range([rowIdx, colIdx], [rowIdx, line.length])
        console.log ranges

        markers = []
        decorations = []
        for range in ranges
            marker = editor.markBufferRange(range)
            markers.push marker
            icon = @_createGutterIcon()
            atom.tooltips.add(icon, {
                title: "<div style='background: blue'>test</div>"
                trigger: "click"
                placement: "right"
                html: true
                delay: 100
            })
            decorations.push @gutter.decorateMarker(marker, {
                # type: "line-number"
                # class: "code-annotation-gutter-icon"
                # item: document.createElement "span"
                item: icon
            })
            # decorations.push editor.decorateMarker(marker, {
            #     # type: "line"
            #     type: "block"
            #     position: "before"
            #     # type: "overlay"
            #     # position: "head"
            #     # position: "before"
            #     # type: "highlight"
            #     # class: 'code-annotation'
            #     item: @_createCodeAnnotationDecoration()
            #     # item: $("<span class='code-annotation-decoration testsests'></span>").get(0)
            # })
            # decorations.push editor.decorateMarker(marker, {
            #     type: "line"
            #     class: 'code-annotation'
            # })
        # end = performance.now()
        # console.log "using markers:", (end - start), "ms"
        console.log markers
        console.log decorations
        console.log $(".line.code-annotation")

        # THE BELOW IS SLOWER!
        # start = performance.now()
        # view = atom.views.getView(editor)
        # comments = $(view.shadowRoot).find(".coffee.comment.line")
        # comments.each (idx, comment) ->
        #     comment = $(comment)
        #     if not comment.hasClass("code-annotation") and comment.text().slice(0, 18) is "# CODE-ANNOTATION:"
        #         wrapperSpan = $("<span class='code-annotation' />")
        #         span = $("<span />").addClass("icon icon-code-annotation")
        #         wrapperSpan
        #             .append comment.children(".punctuation")
        #             .append span
        #         comment.replaceWith wrapperSpan
        #         # console.log comment
        # end = performance.now()
        # console.log "using dom manipulation:", (end - start), "ms"

        # return if @modalPanel.isVisible() then @modalPanel.hide() else @modalPanel.show()
        return true
