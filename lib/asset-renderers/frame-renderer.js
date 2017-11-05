'use babel'

import AssetRenderer from './asset-renderer'

export default class FrameRenderer extends AssetRenderer {
    static parent = AssetRenderer

    constructor(asset) {
        super(asset)
        this.frameUrl = null
        this.frame = null
    }

    // this method must be implemented by subclasses
    // _baseUrl: (clearCache) ->
    //     return "some path"

    _createSrcElement() {
        return document.createElement('iframe')
    }

    _buildUrl(codeAnnotationManager, clearCache) {
        const container = codeAnnotationManager.codeAnnotationContainer
        return (
            `${this._baseUrl(clearCache)}`
            + `?width=${container.width}`
            + `&height=${container.height}`
            + `&textColor=${codeAnnotationManager.textColor}`
            + `&backgroundColor=${codeAnnotationManager.backgroundColor}`
        ).replace(/\s/g, '')
    }

    _render(codeAnnotationManager, clearCache) {
        const frame = this._createSrcElement()
        frame.src = this._buildUrl(codeAnnotationManager, clearCache)
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
