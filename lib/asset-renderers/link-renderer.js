'use babel'

import FrameRenderer from './frame-renderer'

// TODO: use ajax loader
export default class LinkRenderer extends FrameRenderer {
    static parent = FrameRenderer
    static isTextBased = true
    static description = 'Shows the web page belonging to a URL'

    _baseUrl() {
        return this.rawAnnotation.content
    }

    _buildUrl(codeAnnotationManager) {
        return this._baseUrl()
    }

    _createSrcElement() {
        return document.createElement('webview')
    }
}
