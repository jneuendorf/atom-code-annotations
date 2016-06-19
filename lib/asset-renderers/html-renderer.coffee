AssetRenderer = require './asset-renderer'

module.exports = class HtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: /.*\.(html|htm)$/

    render: () ->
        # TODO: use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(false)
        div.className = "rendered html-renderer"
        return div
