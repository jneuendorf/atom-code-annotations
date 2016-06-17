AssetRenderer = require './asset-renderer'

module.exports = class HtmlRenderer extends AssetRenderer

    @parent = AssetRenderer

    render: () ->
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(false)
        div.className = "rendered html-renderer"
        return div
