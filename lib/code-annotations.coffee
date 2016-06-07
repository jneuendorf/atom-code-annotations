CodeAnnotationsView = require './code-annotations-view'
{CompositeDisposable, Range} = require 'atom'
# $ = jQuery = require 'jquery'


module.exports = CodeAnnotations =

    codeAnnotationsView: null
    modalPanel: null
    subscriptions: null

    activate: (state) ->
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

    # CODE-ANNOTATION: asdf
    toggle: () ->
        # console.log('CodeAnnotations was toggled!')
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
            decorations.push editor.decorateMarker(marker, {
                # type: "line"
                # type: "block"
                # position: "before"
                # type: "overlay"
                # position: "head"
                # position: "before"
                type: "highlight"
                class: 'code-annotation'
                # item: $("<span class='testsests' />").get(0)
            })
            decorations.push editor.decorateMarker(marker, {
                type: "line"
                class: 'code-annotation'
            })
        # end = performance.now()
        # console.log "using markers:", (end - start), "ms"
        console.log markers
        console.log decorations

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
