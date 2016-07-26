Utils = require './utils'



document.registerElement("code-annotation-container", {
    prototype: Object.create(HTMLDivElement.prototype)
    extends: "div"
})



module.exports = class CodeAnnotationContainer

    # CONSTRUCTOR
    constructor: (codeAnnotationManager, visible = false) ->
        @codeAnnotationManager = codeAnnotationManager
        @element = document.createElement("code-annotation-container")
        if not visible
            @hide()
        # TODO: use atom's button class
        @closeBtn = Utils.createElement("div", "close code-annotation-button")
        @editBtn = Utils.createElement("div", "edit code-annotation-button")
        @deleteBtn = Utils.createElement("div", "delete code-annotation-button")
        @content = Utils.createElement("div", "content")

        @deleteBtn.addEventListener "click", (event) =>
            return @codeAnnotationManager.getCurrentCodeAnnotation().delete()
        @editBtn.addEventListener "click", (event) =>
            return @codeAnnotationManager.getCurrentCodeAnnotation().edit()
        @closeBtn.addEventListener "click", (event) =>
            return @hide()

        @element.appendChild @content
        @element.appendChild @deleteBtn
        @element.appendChild @editBtn
        @element.appendChild @closeBtn

    getElement: () ->
        return @element

    destroy: () ->
        @element.parentNode.removeChild @element
        return @

    show: () ->
        @element.style.display = "block"
        return @

    hide: () ->
        @element.style.display = "none"
        return @

    empty: () ->
        Utils.removeChildNodes(@content)
        return @

    append: (element) ->
        @content.appendChild(element)
        return @
