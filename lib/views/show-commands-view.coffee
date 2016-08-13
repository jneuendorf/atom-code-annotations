SelectListView = require "./select-list-view"

CodeAnnotations = require "../constants"


module.exports = class ShowCommandsView extends SelectListView

    initialize: () ->
        super()
        @atomWorkspaceView = atom.views.getView(atom.workspace)

    getFilterKey: () ->
        return "displayName"

    getKeyBindings: (ignoredNames) ->
        namePrefix = "#{CodeAnnotations.PACKAGE_NAME}:"
        displayNamePrefix = "Code Annotations: "
        allKeybindings = atom.commands.findCommands({target: @atomWorkspaceView})
        keybindings = []
        for keybinding in allKeybindings when keybinding.name.startsWith(namePrefix) and keybinding.name not in ignoredNames
            keybindings.push({
                name: keybinding.name
                displayName: keybinding.displayName.slice(displayNamePrefix.length)
            })
        return keybindings

    beforeShow: (ignoredNames) ->
        if not @keybindings?
            @keybindings = @getKeyBindings(ignoredNames)
        return @keybindings

    viewForItem: ({name, displayName}) ->
        return @$$ () ->
            return @li class: 'event', =>
                @span title: displayName, displayName

    confirmed: ({name, displayName}) ->
        @cancel()
        atom.commands.dispatch(@atomWorkspaceView, name)
        return @
