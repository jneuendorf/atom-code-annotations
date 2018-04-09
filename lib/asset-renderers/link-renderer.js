'use babel'

import FrameRenderer from './frame-renderer'

// TODO: use ajax loader
export default class LinkRenderer extends FrameRenderer {
    static parent = FrameRenderer
    static isBinary = false
    static description = 'Shows the web page belonging to a URL'
    static type = 'link'
    static fileExtension = 'txt'

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
