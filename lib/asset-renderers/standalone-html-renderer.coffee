AssetRenderer = require './asset-renderer'

module.exports = class StandaloneHtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["s.html", "s.htm"]
    @isTextBased: true
    @description: "Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)"

    _render: (codeAnnotationManager) ->
        iframe = document.createElement("iframe")
        container = codeAnnotationManager.codeAnnotationContainer
        iframe.src = """#{@asset.getPath()}
            ?width=#{container.width}
            &height=#{container.height}
            &textColor=#{codeAnnotationManager.textColor}
            &backgroundColor=#{codeAnnotationManager.backgroundColor}""".replace(/\s/g, "")
        return iframe
