fs = require "fs"

FrameRenderer = require './frame-renderer'


module.exports = class LinkRenderer extends FrameRenderer

    @parent: FrameRenderer
    @fileExtension: ["webloc", "url"]
    @isTextBased: true
    @description: "Render a web page"

    _baseUrl: () ->
        return "#{fs.readFileSync(@asset.getPath())}".trim()

    _buildUrl: () ->
        return @_baseUrl()

    _createSrcElement: () ->
        return document.createElement("webview")
