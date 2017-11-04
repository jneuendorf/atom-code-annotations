'use babel';

import AssetRenderer from './asset-renderer';

export default class InlineHtmlRenderer extends AssetRenderer {
    _render(codeAnnotationManager, clearCache) {
        // NOTE: wanted to use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        //       but javascript targeting inside shadow dom elements is weird...therefore there is the StandaloneHtmlRenderer
        const div = document.createElement("div");
        div.innerHTML = this.asset.readSync(clearCache);
        return div;
    }
};
InlineHtmlRenderer.parent = AssetRenderer;
InlineHtmlRenderer.fileExtension = ["i.html", "i.htm"];
InlineHtmlRenderer.isTextBased = true;
InlineHtmlRenderer.description = "Render HTML inline";
