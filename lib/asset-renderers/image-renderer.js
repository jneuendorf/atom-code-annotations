'use babel';

import AssetRenderer from './asset-renderer';

// ImageRenderer supports chrome's native image support.
// For details see https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
export default class ImageRenderer extends AssetRenderer {
    _render(codeAnnotationManager, clearCache) {
        const img = document.createElement("img");
        img.src = this.asset.getPath();
        return img;
    }
};
ImageRenderer.parent = AssetRenderer;
ImageRenderer.fileExtension = ["png", "gif", "jpg", "jpeg", "bmp"];
ImageRenderer.isTextBased = false;
ImageRenderer.description = "Render images as &lt;img&gt; tags (currently supports png, gif, jpg, jpeg and bmp)";
