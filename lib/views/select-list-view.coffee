{SelectListView, $$} = require "atom-space-pen-views"
path = require "path"


module.exports = class MySelectLiewView extends SelectListView

    initialize: () ->
        super()
        @panel = null
        @$$ = $$
        @addClass('command-palette')

    cancelled: () ->
        return @hide()

    toggle: () ->
        if @panel?.isVisible()
            @cancel()
        else
            @show()
        return @

    beforeShow: (items) ->
        return items

    show: (items) ->
        @storeFocusedElement()
        if items?
            items = @beforeShow(items)
            @setItems(items)
        @panel ?= atom.workspace.addModalPanel(item: @)
        @panel.show()
        @focusFilterEditor()
        return @

    hide: () ->
        @panel?.hide()
        return @

    confirmed: (item) ->
        @cancel()
        @afterConfirmed(item)
        return @
