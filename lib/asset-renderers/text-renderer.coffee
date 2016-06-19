AssetRenderer = require './asset-renderer'

module.exports = class TextRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ".txt"
    @isTextBased: true

    render: () ->
        # TODO: use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(false).replace(/\n/g, "<br>")
        div.className = "rendered text-renderer"
        return div
