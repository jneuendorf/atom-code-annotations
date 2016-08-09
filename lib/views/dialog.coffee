# NOTE: adapted from tree-view package
{$, TextEditorView, View} = require 'atom-space-pen-views'


module.exports = class Dialog extends View

    @content: ({prompt} = {}) ->
        @div class: 'code-annotations-dialog', =>
            @label prompt, class: 'icon', outlet: 'promptText'
            @subview 'miniEditor', new TextEditorView(mini: true)

    # this method gets called right after the constructor with the constructor's arguments (applied)
    # initialize: ({initialPath = "", select = false, iconClass} = {}) ->
    initialize: ({iconClass} = {}) ->
        @miniEditorModel = @miniEditor.getModel()
        if iconClass
            @promptText.addClass(iconClass)
        atom.commands.add @element, {
            'core:confirm': () =>
                return @_submit(@miniEditor.getText())
            'core:cancel': () =>
                return @close()
        }
        if document.hasFocus()
            @miniEditor.on 'blur', () =>
                return @close()
        return @

    attach: ->
        @panel = atom.workspace.addModalPanel({item: @element})
        @miniEditorModel.scrollToCursorPosition()
        @miniEditor.focus()
        return @

    close: ->
        panelToDestroy = @panel
        @panel = null
        panelToDestroy?.destroy()
        atom.workspace.getActivePane().activate()
        return @

    _submit: () ->
        throw new Error("Must be implemented by subclass!")

    onSubmit: (callback) ->
        @onSubmitCallback = callback
        return @
