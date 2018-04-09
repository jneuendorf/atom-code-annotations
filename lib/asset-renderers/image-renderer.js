'use babel'

import AssetRenderer from './asset-renderer'

// ImageRenderer supports chrome's native image support.
// For details see https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
export default class ImageRenderer extends AssetRenderer {
    static parent = AssetRenderer
    static isBinary = true
    static description = 'Renders images as &lt;img&gt; tags (currently supports png, gif, jpg, jpeg and bmp)'
    static type = 'image'
    // static fileExtension = 'png'

    _render(codeAnnotationManager) {
        const img = document.createElement('img')
        img.src = this.rawAnnotation.content
        return img
    }
}
