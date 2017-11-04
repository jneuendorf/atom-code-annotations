'use babel';

import AssetRenderer from './asset-renderer';

export default class TextRenderer extends AssetRenderer {
    _render(codeAnnotationManager, clearCache) {
        const pre = document.createElement("pre");
        pre.innerHTML = this.asset.readSync(clearCache).replace(/>/g, "&gt;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;");
        return pre;
    }
};
TextRenderer.parent = AssetRenderer;
TextRenderer.fileExtension = "txt";
TextRenderer.isTextBased = true;
TextRenderer.description = "Render plain text";
