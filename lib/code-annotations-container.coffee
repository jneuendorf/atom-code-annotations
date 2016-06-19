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
        @editBtn = Utils.createElement("div", "edit")
        @content = Utils.createElement("div", "content")


        @element.appendChild @content
        @element.appendChild @editBtn
        @element.appendChild @closeBtn

        @closeBtn.addEventListener "click", (event) =>
            return @hide()
        @editBtn.addEventListener "click", (event) =>
            return @editAsset()

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

    editAsset: () ->
        # get asset associated with the pin that was just clicked
        # get renderer for asset
        # according to renderer's isTextBased do:
        #     if renderer.isTextBased is true
        #         # load asset contents into new tab
        #     else
        #         # show 'choose file' dialog
        # save changes
        return @
