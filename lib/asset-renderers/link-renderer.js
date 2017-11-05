'use babel'

import FrameRenderer from './frame-renderer'

// TODO: use ajax loader
export default class LinkRenderer extends FrameRenderer {
    static parent = FrameRenderer
    static fileExtension = ['webloc', 'url']
    static isTextBased = true
    static description = 'Render a web page'

    _baseUrl(clearCache) {
        return this.asset.readSync(clearCache).trim()
    }

    _buildUrl(codeAnnotationManager, clearCache) {
        return this._baseUrl(clearCache)
    }

    _createSrcElement() {
        return document.createElement('webview')
    }
}
