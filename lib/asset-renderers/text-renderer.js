'use babel'

import AssetRenderer from './asset-renderer'

export default class TextRenderer extends AssetRenderer {
    static parent = AssetRenderer
    static fileExtension = 'txt'
    static isTextBased = true
    static description = 'Render plain text'

    _render(codeAnnotationManager, clearCache) {
        const pre = document.createElement('pre')
        pre.innerHTML = this.asset.readSync(clearCache).replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;')
        return pre
    }
}
