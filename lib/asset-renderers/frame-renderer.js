'use babel'

import AssetRenderer from './asset-renderer'

export default class FrameRenderer extends AssetRenderer {
    static parent = AssetRenderer

    constructor(rawAnnotation) {
        super(rawAnnotation)
        this.frameUrl = null
        this.frame = null
    }

    // this method must be implemented by subclasses
    // _baseUrl: () ->
    //     return "some path"

    _createSrcElement() {
        return document.createElement('iframe')
    }

    _buildUrl(codeAnnotationManager) {
        const container = codeAnnotationManager.codeAnnotationContainer
        return (
            `${this._baseUrl()}`
            + `?width=${container.width}`
            + `&height=${container.height}`
            + `&textColor=${codeAnnotationManager.textColor}`
            + `&backgroundColor=${codeAnnotationManager.backgroundColor}`
        ).replace(/\s/g, '')
    }

    _render(codeAnnotationManager) {
        const frame = this._createSrcElement()
        frame.src = this._buildUrl(codeAnnotationManager)
        this.frame = frame
        return frame
    }

    // update url if get parameters have changed
    afterShow(codeAnnotationManager) {
        const frameUrl = this._buildUrl(codeAnnotationManager)
        if (frameUrl !== this.frameUrl) {
            this.frameUrl = frameUrl
            this.frame.src = frameUrl
        }
    }
}
