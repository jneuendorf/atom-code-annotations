'use babel'

import AssetRenderer from './asset-renderer'

export default class TextRenderer extends AssetRenderer {
    static parent = AssetRenderer
    static isTextBased = true
    static description = 'Renders plain text'

    _render(codeAnnotationManager) {
        const pre = document.createElement('pre')
        pre.innerHTML = this.rawAnnotation.content.replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
        return pre
    }
}
