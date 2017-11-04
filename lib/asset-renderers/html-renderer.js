'use babel';

import FrameRenderer from './frame-renderer';

export default class HtmlRenderer extends FrameRenderer {
    _baseUrl() {
        return this.asset.getPath();
    }
};
HtmlRenderer.parent = FrameRenderer;
HtmlRenderer.fileExtension = ["html", "htm"];
HtmlRenderer.isTextBased = true;
HtmlRenderer.description = "Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)";
