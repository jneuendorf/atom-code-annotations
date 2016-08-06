AssetRenderer = require './asset-renderer'

module.exports = class HtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["html", "htm"]
    @isTextBased: true
    @description: "Render HTML inline"

    _render: () ->
        # NOTE: wanted to use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        # NOTE: but javascript targeting inside shadow dom elements is weird...therefore there is the StandaloneHtmlRenderer
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(false)
        return div
