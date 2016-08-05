AssetRenderer = require './asset-renderer'

# ImageRenderer supports chrome's native image support.
# For details see https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
module.exports = class ImageRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["png", "gif", "jpg", "jpeg", "bmp"]
    @isTextBased: false

    _render: () ->
        img = document.createElement("img")
        img.src = @asset.getPath()
        # img.className = "rendered image-renderer"
        return img
        # div = document.createElement("div")
        # div.style.backgroundImage = "url(#{@asset.getPath()})"
        # div.className = "rendered image-renderer"
        # return div
