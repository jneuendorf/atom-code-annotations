SelectListView = require "./select-list-view"


module.exports = class ChangeTypeView extends SelectListView

    initialize: () ->
        super()
        # set from the outside (in CodeAnnotationContainer)
        @codeAnnotationContainer = null

    getFilterKey: () ->
        return "searchString"

    beforeShow: (renderers) ->
        items = []
        for renderer in renderers
            if typeof renderer.fileExtension isnt "string"
                fileExtension = renderer.fileExtension.join(" ")
                fileExtensionLabel = renderer.fileExtension.join(", ")
            else
                fileExtension = renderer.fileExtension
                fileExtensionLabel = renderer.fileExtension
            items.push {
                name: renderer.name
                fileExtension
                fileExtensionLabel
                searchString: "#{renderer.name} #{fileExtension}"
                rendererClass: renderer
            }
        return items

    viewForItem: ({name, fileExtensionLabel}) ->
        return @$$ () ->
            return @li class: 'event', 'data-event-name': name, =>
                @div class: 'pull-right', =>
                    @span "(#{fileExtensionLabel})"
                @span title: name, name

    confirmed: ({rendererClass}) ->
        @cancel()
        @codeAnnotationContainer.changeAnnotationType(rendererClass)
        return @
