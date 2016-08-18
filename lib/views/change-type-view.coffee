SelectListView = require "./select-list-view"


module.exports = class ChangeTypeView extends SelectListView

    initialize: () ->
        super()
        # set from the outside (in CodeAnnotationContainer)
        @codeAnnotationContainer = null

    getFilterKey: () ->
        return "searchString"

    beforeShow: (rendererClasses) ->
        items = []
        for rendererClass in rendererClasses
            if typeof rendererClass.fileExtension isnt "string"
                fileExtension = rendererClass.fileExtension.join(" ")
                fileExtensionLabel = rendererClass.fileExtension.join(", ")
            else
                fileExtension = rendererClass.fileExtension
                fileExtensionLabel = rendererClass.fileExtension
            items.push {
                name: rendererClass.getName()
                fileExtension
                fileExtensionLabel
                searchString: "#{rendererClass.getName()} #{fileExtension}"
                rendererClass: rendererClass
            }
        return items

    viewForItem: ({name, fileExtensionLabel}) ->
        return @$$ () ->
            return @li class: 'event', =>
                @div class: 'pull-right', =>
                    @span "(#{fileExtensionLabel})"
                @span title: name, name

    confirmed: ({rendererClass}) ->
        @cancel()
        @codeAnnotationContainer.changeAnnotationType(rendererClass)
        return @
