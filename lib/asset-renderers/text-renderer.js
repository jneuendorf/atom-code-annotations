'use babel'

import AssetRenderer from './asset-renderer'

export default class TextRenderer extends AssetRenderer {
    static parent = AssetRenderer
    static isBinary = false
    static description = 'Renders plain text'
    static type = 'text'

    _render(codeAnnotationManager) {
        const pre = document.createElement('pre')
        pre.innerHTML = this.rawAnnotation.content.replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
        return pre
    }
}
