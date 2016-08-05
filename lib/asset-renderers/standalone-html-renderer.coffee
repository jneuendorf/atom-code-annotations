AssetRenderer = require './asset-renderer'

module.exports = class StandaloneHtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["s.html", "s.htm"]
    @isTextBased: true

    _render: () ->
        iframe = document.createElement("iframe")
        # iframe.className = "rendered standalone-html-renderer"
        # TODO: pass e.g. text color as get parameter
        iframe.src = @asset.getPath()
        return iframe
