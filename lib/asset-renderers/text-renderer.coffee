AssetRenderer = require './asset-renderer'

module.exports = class TextRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: "txt"
    @isTextBased: true
    @description: "Render plain text"

    _render: () ->
        pre = document.createElement("pre")
        # pre.innerHTML = @asset.readSync(false).replace(/\n/g, "<br>")
        pre.innerHTML = @asset.readSync(false).replace(/>/g, "&gt;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;")
        return pre
