Utils = require './utils'


document.registerElement("code-annotations-container", {
    prototype: Object.create(HTMLDivElement.prototype)
    extends: "div"
})

module.exports = class CodeAnnotationsContainer

    # CONSTRUCTOR
    constructor: (codeAnnotations, visible = false) ->
        @codeAnnotations = codeAnnotations
        @element = document.createElement("code-annotations-container")
        if not visible
            @hide()
        @closeBtn = Utils.createElement("div", "close code-annotation-button")
        @editBtn = Utils.createElement("div", "edit code-annotation-button")
        @content = Utils.createElement("div", "content")

        @element.appendChild @content
        @element.appendChild @editBtn
        @element.appendChild @closeBtn

        @closeBtn.addEventListener "click", (event) =>
            return @hide()
        @editBtn.addEventListener "click", (event) =>
            return @codeAnnotations.getCurrentCodeAnnotation().edit()

    getElement: () ->
        return @element

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
