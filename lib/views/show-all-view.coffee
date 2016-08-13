SelectListView = require "./select-list-view"
path = require "path"


module.exports = class ShowAllView extends SelectListView

    getFilterKey: () ->
        return "annotationName"

    beforeShow: (groupedItems) ->
        items = []
        for editorPath, annotations of groupedItems
            for annotation in annotations
                items.push {
                    editorPath
                    filename: path.basename(editorPath)
                    annotationName: annotation.name
                    lineNumber: annotation.marker.getBufferRange().start.row
                }
        return items

    viewForItem: ({annotationName, filename, lineNumber}) ->
        return @$$ () ->
            return @li class: 'event', =>
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
        # TODO: this is not working like that:
        # atom.workspace.getActiveTextEditor().getLastCursor().moveToFirstCharacterOfLine()
        return @
