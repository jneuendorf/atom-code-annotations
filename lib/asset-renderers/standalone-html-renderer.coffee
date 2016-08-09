AssetRenderer = require './asset-renderer'

module.exports = class StandaloneHtmlRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["s.html", "s.htm"]
    @isTextBased: true
    @description: "Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)"

    # CONSTRUCTOR
    constructor: (asset) ->
        super(asset)
        @iframeUrl = null
        @iframe = null

    _render: (codeAnnotationManager) ->
        iframe = document.createElement("iframe")
        container = codeAnnotationManager.codeAnnotationContainer
        iframe.src = """#{@asset.getPath()}
            ?width=#{container.width}
            &height=#{container.height}
            &textColor=#{codeAnnotationManager.textColor}
            &backgroundColor=#{codeAnnotationManager.backgroundColor}""".replace(/\s/g, "")
        @iframe = iframe
        return iframe

    # update url if it has changed
    afterShow: (codeAnnotationManager) ->
        codeAnnotationContainer = codeAnnotationManager.codeAnnotationContainer
        iframeUrl = """#{@asset.getPath()}
            ?width=#{codeAnnotationContainer.width}
            &height=#{codeAnnotationContainer.height}
            &textColor=#{codeAnnotationManager.textColor}
            &backgroundColor=#{codeAnnotationManager.backgroundColor}""".replace(/\s/g, "")
        if iframeUrl isnt @iframeUrl
            @iframeUrl = iframeUrl
            @iframe.src = iframeUrl
        return @
