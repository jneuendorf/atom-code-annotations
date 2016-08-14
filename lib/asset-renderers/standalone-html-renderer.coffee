FrameRenderer = require './frame-renderer'


module.exports = class StandaloneHtmlRenderer extends FrameRenderer

    @parent: FrameRenderer
    @fileExtension: ["s.html", "s.htm"]
    @isTextBased: true
    @description: "Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)"

    _baseUrl: () ->
        return @asset.getPath()
