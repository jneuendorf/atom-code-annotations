'use babel';

import fs from "fs";

import FrameRenderer from './frame-renderer';

// TODO: use ajax loader
export default class LinkRenderer extends FrameRenderer {
    _baseUrl(clearCache) {
        // return "#{fs.readFileSync(@asset.getPath())}".trim()
        return this.asset.readSync(clearCache).trim();
    }

    _buildUrl(codeAnnotationManager, clearCache) {
        return this._baseUrl(clearCache);
    }

    _createSrcElement() {
        return document.createElement("webview");
    }
};
LinkRenderer.parent = FrameRenderer;
LinkRenderer.fileExtension = ["webloc", "url"];
LinkRenderer.isTextBased = true;
LinkRenderer.description = "Render a web page";
