{$, TextEditorView} = require 'atom-space-pen-views'

CodeAnnotations = require "../constants"
Config = require "../config"
Utils = require "../utils"

ChangeTypeView = require "./change-type-view"


module.exports = class CodeAnnotationContainer

    # DEFINE MARKUP
    @element: do () ->
        return $ """<code-annotation-container>
            <div class="hidden"></div>
            <div class="top block">
                <div class="row">
                    <div class="col-xs-5 left-col">
                        <h4 class="code-annotation-name" title="double click to edit"></h4>
                    </div>
                    <div class="col-xs-7">
                        <button class="inline-block btn icon icon-trashcan delete">Delete</button>
                        <button class="inline-block btn icon icon-x disappear">Close</button>
                        <button class="inline-block btn icon icon-pencil edit">Edit content</button>
                        <button class="inline-block btn icon icon-paintcan change-type">Change type</button>
                    </div>
                </div>
            </div>
            <hr class="middle line">
            <div class="bottom block content">
            </div>
        </code-annotation-container>"""


    # CONSTRUCTOR
    constructor: (codeAnnotationManager) ->
        @codeAnnotationManager = codeAnnotationManager
        @codeAnnotation = null
        @nameElement = null
        @content = null
        @textEditorView = null
        # add class to workspace for keymapping
        @atomWorkspaceView = $(atom.views.getView(atom.workspace))
        @atomWorkspaceView.addClass("has-code-annotations-container")

        @element = @_addEventListeners(@_createElement())
        pane = atom.views.getView(atom.workspace.getActivePane())
        pane.appendChild(@getElement())

        # get layout data for being passed onto asset renderers for optimized rendering
        @width = @element.width()
        @height = @element.height()
        hiddenElement = @element.children(".hidden")
        codeAnnotationManager.textColor = hiddenElement.css("color")
        codeAnnotationManager.backgroundColor = hiddenElement.css("background-color")

        @textEditorView.hide()
        @element.hide()

    _addEventListeners: (element) ->
        # buttons
        element.find(".btn.delete").click (event) =>
            if Config.showDeleteConfirmDialog and not Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
                return @
            @codeAnnotation.delete()
            return @hide()
        element.find(".btn.edit").click (event) =>
            return @codeAnnotation.edit()
        element.find(".btn.disappear").click (event) =>
            return @hide()
        element.find(".btn.change-type").click (event) =>
            return @changeTypeView.show(@codeAnnotationManager.renderers)
        # asset name elements' events
        @nameElement.dblclick () =>
            @toggleMiniTextEditor()
            @textEditorView.focus()
            return @
        @textEditorView.keyup (evt) =>
            # on escape
            if evt.which is 27
                @toggleMiniTextEditor()
                return false
            # on enter
            if evt.which is 13
                newName = @textEditorView.getText()
                @codeAnnotation.updateName(newName)
                @nameElement.text(newName)
                @toggleMiniTextEditor()
            return true
        return element

    _createElement: () ->
        element = @constructor.element.clone()
        @content = element.find(".content")
        @nameElement = element.find(".code-annotation-name")
        @textEditorView = new TextEditorView({mini: true})
        element.find(".left-col").append(@textEditorView)
        @changeTypeView = new ChangeTypeView()
        @changeTypeView.codeAnnotationContainer = @
        return element

    getElement: () ->
        return @element[0]

    destroy: () ->
        @element.remove()
        return @

    show: () ->
        @element.css("display", "block")
        @width = @element.width()
        @height = @element.height()
        # @element.show 0, () =>
        #     @width = @element.width()
        #     @height = @element.height()
        return @

    hide: () ->
        if @textEditorView.is(":visible")
            @toggleMiniTextEditor()
        @element.css("display", "none")
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
        @content.children().detach()
        @content.append(content)
        @nameElement.text(@codeAnnotation.name)
        @textEditorView.getModel().setText(@codeAnnotation.name)
        return @

    # for editing the asset name
    toggleMiniTextEditor: () ->
        @nameElement.toggle()
        @textEditorView.toggle()
        return @

    changeAnnotationType: (rendererClass) ->
        @codeAnnotation.changeType(rendererClass)
        return @
