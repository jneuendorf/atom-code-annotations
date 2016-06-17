Utils = require './utils'


document.registerElement("code-annotations-container", {
    prototype: Object.create(HTMLDivElement.prototype)
    extends: "div"
})

module.exports = class CodeAnnotationsContainer

    # CONSTRUCTOR
    constructor: (visible = false) ->
        @element = document.createElement("code-annotations-container")
        if not visible
            @hide()
        @closeBtn = Utils.createElement("div", "close")
        @content = Utils.createElement("div", "content")


        @element.appendChild @content
        @element.appendChild @closeBtn

        @closeBtn.addEventListener "click", (event) =>
            return @hide()

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
