AssetRenderer = require './asset-renderer'

# ImageRenderer supports chrome's native image support.
# For details see https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
module.exports = class ImageRenderer extends AssetRenderer

    @parent: AssetRenderer
    @fileExtension: ["png", "gif", "jpg", "jpeg", "bmp"]
    @isTextBased: false
    @description: "Render images as &lt;img&gt; tags (currently supports png, gif, jpg, jpeg and bmp)"

    _render: (codeAnnotationManager, clearCache) ->
        img = document.createElement("img")
        img.src = @asset.getPath()
        return img
