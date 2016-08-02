Utils = require './utils'
# {$, $$, View} = require 'atom-space-pen-views'
{$} = require 'atom-space-pen-views'

CodeAnnotations = require "./constants"
Settings = require "./settings"
Utils = require "./utils"


module.exports = class CodeAnnotationContainer # extends View

    # DEFINE MARKUP
    @element: do () ->
        return $ """<code-annotation-container style="display:none">
            <div class="row">
                <div class='block'>
                    <button class='inline-block btn icon icon-remove-close close'>Close</button>
                    <button class='inline-block btn icon icon-pencil edit'>Edit</button>
                    <button class='inline-block btn icon icon-trashcan delete'>Delete</button>
                </div>
            </div>
            <div class="row">
                <div class="content">
                </div>
            </div>
        </code-annotation-container>"""

    # CONSTRUCTOR
    constructor: (codeAnnotationManager, visible = false) ->
        @codeAnnotationManager = codeAnnotationManager
        @element = @_createElement()
        if visible
            @show()

        # @element = document.createElement("code-annotation-container")
        # if not visible
        #     @hide()
        # # TODO: use atom's button class
        # @closeBtn = Utils.createElement("div", "close code-annotation-button")
        # @editBtn = Utils.createElement("div", "edit code-annotation-button")
        # @deleteBtn = Utils.createElement("div", "delete code-annotation-button")
        # @content = Utils.createElement("div", "content")
        #
        # @deleteBtn.addEventListener "click", (event) =>
        #     return @codeAnnotationManager.getCurrentCodeAnnotation().delete()
        # @editBtn.addEventListener "click", (event) =>
        #     return @codeAnnotationManager.getCurrentCodeAnnotation().edit()
        # @closeBtn.addEventListener "click", (event) =>
        #     return @hide()
        #
        # @element.appendChild @content
        # @element.appendChild @deleteBtn
        # @element.appendChild @editBtn
        # @element.appendChild @closeBtn

    _addEventListeners: (element) ->
        element.find(".btn.delete").click (event) =>
            if Settings.showDeleteConfirmDialog and not Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})
                return @
            @codeAnnotationManager.getCurrentCodeAnnotation().delete()
            return @hide()
        element.find(".btn.edit").click (event) =>
            return @codeAnnotationManager.getCurrentCodeAnnotation().edit()
        element.find(".btn.close").click (event) =>
            return @hide()
        return element

    _createElement: () ->
        element = @_addEventListeners(@constructor.element.clone(true, true))
        @content = element.find(".content")
        return element

    getElement: () ->
        return @element[0]

    destroy: () ->
        @element.parentNode.removeChild @element
        return @

    show: () ->
        # @element.style.display = "block"
        @element.show()
        return @

    hide: () ->
        # @element.style.display = "none"
        @element.hide()
        return @

    empty: () ->
        # Utils.removeChildNodes(@content)
        @content.empty()
        return @

    append: (element) ->
        # @content.appendChild(element)
        @content.append(element)
        return @
