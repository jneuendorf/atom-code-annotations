'use babel'

import FrameRenderer from './frame-renderer'

export default class HtmlRenderer extends FrameRenderer {
    static parent = FrameRenderer
    static fileExtension = ['html', 'htm']
    static isTextBased = true
    static description = 'Render HTML in an iframe (this enables complete capsulation of CSS and JavaScript)'

    _baseUrl() {
        return this.asset.getPath()
    }
}
