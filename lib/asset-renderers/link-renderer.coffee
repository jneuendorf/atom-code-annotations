fs = require "fs"

FrameRenderer = require './frame-renderer'


module.exports = class LinkRenderer extends FrameRenderer

    @parent: FrameRenderer
    @fileExtension: ["webloc", "url"]
    @isTextBased: true
    @description: "Render a web page"

    _baseUrl: (clearCache) ->
        # return "#{fs.readFileSync(@asset.getPath())}".trim()
        return @asset.readSync(clearCache).trim()

    _buildUrl: (codeAnnotationManager, clearCache) ->
        return @_baseUrl(clearCache)

    _createSrcElement: () ->
        return document.createElement("webview")
