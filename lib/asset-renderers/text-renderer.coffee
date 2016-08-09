AssetRenderer = require './asset-renderer'

module.exports = class TextRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: "txt"
    @isTextBased: true
    @description: "Render plain text"

    _render: (codeAnnotationManager) ->
        pre = document.createElement("pre")
        pre.innerHTML = @asset.readSync(false).replace(/>/g, "&gt;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;")
        return pre
