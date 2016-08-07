{SelectListView, $$} = require "atom-space-pen-views"
path = require "path"
CodeAnnotationManager = require "../code-annotation-manager"

module.exports = class ShowAllView extends SelectListView

    initialize: () ->
        super()
        @addClass('command-palette')

    getFilterKey: () ->
        return "annotationName"

    cancelled: () ->
        @restoreFocus()
        return @hide()

    toggle: () ->
        if @panel?.isVisible()
            @cancel()
        else
            @show()
        return @

    show: (groupedItems) ->
        @storeFocusedElement()

        items = []
        for editorPath, annotations of groupedItems
            for annotation in annotations
                items.push {
                    editorPath
                    filename: path.basename(editorPath)
                    annotationName: annotation.name
                    lineNumber: annotation.marker.getBufferRange().start.row
                }

        @setItems(items)
        @panel ?= atom.workspace.addModalPanel(item: @)
        @panel.show()
        @focusFilterEditor()
        return @

    hide: () ->
        @panel?.hide()
        return @

    viewForItem: ({annotationName, filename, lineNumber}) ->
        return $$ () ->
            # return @li("#{name} (#{editorPath})")
            return @li class: 'event', 'data-event-name': annotationName, =>
                @div class: 'pull-right', =>
                    @span "#{filename} @ #{lineNumber + 1}"
                @span title: annotationName, annotationName

    confirmed: ({annotationName, filename, editorPath, lineNumber}) ->
        @cancel()
        atom.workspace.open(editorPath, {
            initialLine: lineNumber
            # initialColumn: 0
            pending: true
        })
        # atom.workspace.getActiveTextEditor().getLastCursor().moveToFirstCharacterOfLine()
        return @
