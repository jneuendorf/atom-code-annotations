AssetRenderer = require './asset-renderer'

module.exports = class ImageRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: /^.*\.(png|gif|jpg|jpeg|bmp)$/

    render: () ->
        img = document.createElement("img")
        img.src = @asset.getPath()
        # img.style.maxWidth = "100%"
        # img.style.maxHeight = "100%"
        img.className = "rendered image-renderer"
        return img
        # div = document.createElement("div")
        # div.style.backgroundImage = "url(#{@asset.getPath()})"
        # div.className = "rendered image-renderer"
        # return div
