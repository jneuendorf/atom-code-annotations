AssetRenderer = require './asset-renderer'

module.exports = class TextRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: "txt"
    @isTextBased: true
    @description: "Render plain text"

    _render: () ->
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(false).replace(/\n/g, "<br>")
        # div.className = "rendered text-renderer"
        return div
