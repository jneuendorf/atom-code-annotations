FrameRenderer = require './frame-renderer'


module.exports = class HtmlRenderer extends FrameRenderer

    @parent: FrameRenderer
    @fileExtension: ["html", "htm"]
    @isTextBased: true
    @description: "Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)"

    _baseUrl: () ->
        return @asset.getPath()
