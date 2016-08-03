Utils = require './utils'
{$, TextEditorView} = require 'atom-space-pen-views'

CodeAnnotations = require "./constants"
Settings = require "./settings"
Utils = require "./utils"


module.exports = class CodeAnnotationContainer

    # DEFINE MARKUP
    @element: do () ->
        return $ """<code-annotation-container>
            <div class='block'>
                <div class='row'>
                    <div class='col-xs-5 left-col'>
                        <h4 class='code-annotation-name'></h4>
                    </div>
                    <div class='col-xs-7'>
                        <button class='inline-block btn icon icon-trashcan delete'>Delete</button>
                        <button class='inline-block btn icon icon-x disappear'>Close</button>
                        <button class='inline-block btn icon icon-pencil edit'>Edit</button>
                    </div>
                </div>
            </div>
            <hr class="line">
            <div class="block content">
            </div>
        </code-annotation-container>"""

    # CONSTRUCTOR
    constructor: (visible = false) ->
        @element = @_createElement()
        @codeAnnotation = null
        if visible
            @show()

    _addEventListeners: (element) ->
        element.find(".btn.delete").click (event) =>
            if Settings.showDeleteConfirmDialog and not Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
                return @
            @codeAnnotation?.delete()
            return @hide()
        element.find(".btn.edit").click (event) =>
            return @codeAnnotation?.edit()
        element.find(".btn.disappear").click (event) =>
            return @hide()
        return element

    _createElement: () ->
        element = @_addEventListeners(@constructor.element.clone())
        @content = element.find(".content")
        @nameElement = element.find(".code-annotation-name").dblclick () =>
            @toggleMiniTextEditor()
            return @
        @textEditorView = new TextEditorView({mini: true})
        element.find(".left-col").append(@textEditorView)
        @textEditorView.hide().keyup (evt) =>
            # on enter
            if evt.which is 13
                newName = @textEditorView.getText()
                @codeAnnotation.updateName(newName)
                @nameElement.text(newName)
                @toggleMiniTextEditor()
            # on escape
            else if evt.which is 27
                @toggleMiniTextEditor()
            return true
        return element

    getElement: () ->
        return @element[0]

    destroy: () ->
        @element.remove()
        return @

    show: () ->
        @element.show()
        return @

    hide: () ->
        if @textEditorView.is(":visible")
            @toggleMiniTextEditor()
        @element.hide()
        return @

    empty: () ->
        @content.empty()
        return @

    append: (element) ->
        @content.append(element)
        return @

    setCodeAnnotation: (codeAnnotation) ->
        @codeAnnotation = codeAnnotation
        return @

    setContent: (content) ->
        @content.empty().append(content)
        @nameElement.text(@codeAnnotation.name)
        @textEditorView.getModel().setText(@codeAnnotation.name)
        return @

    # for editing the asset name
    toggleMiniTextEditor: () ->
        @nameElement.toggle()
        @textEditorView.toggle()
        return @
