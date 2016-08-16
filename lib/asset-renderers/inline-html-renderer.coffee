AssetRenderer = require './asset-renderer'

module.exports = class InlineHtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["i.html", "i.htm"]
    @isTextBased: true
    @description: "Render HTML inline"

    _render: (codeAnnotationManager, clearCache) ->
        # NOTE: wanted to use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        #       but javascript targeting inside shadow dom elements is weird...therefore there is the StandaloneHtmlRenderer
        div = document.createElement("div")
        div.innerHTML = @asset.readSync(clearCache)
        return div
