'use babel'

import * as Utils from '../utils'


export default class AssetRenderer {
    static parent = null
    static type = null
    // The extension is used when editing contents.
    static fileExtension = null
    // This value is used for choosing the preferred renderer.
    // Plugins should set a greater value to override the built-in renderers.
    static priority = 0
    // asset kind: text-based -> directly editable, not text-based (= binary) -> replaceable only
    static isBinary = null
    static description = null

    constructor(rawAnnotation) {
        this.rawAnnotation = rawAnnotation
    }

    static getName() {
        return this.name
    }

    // TODO: dont change the class. just check its API
    static ensureSameApi(rendererClass) {
        if (rendererClass.prototype instanceof AssetRenderer) {
            return rendererClass
        }
        console.log(rendererClass)
        const isValid = rendererClass.prototype._render instanceof Function &&
            rendererClass.getName instanceof Function &&
            rendererClass.fileExtension &&
            (typeof(rendererClass.isBinary) === 'boolean')

        if (!isValid) {
            return null
        }

        // minimal api is ok => create new class as subclass of AssetRenderer to make sure entire api is there
        // note that coffeescript's extends is in-place
        class AdjustedRenderer extends this {}

        for (const key of Object.keys(rendererClass)) {
            AdjustedRenderer[key] = rendererClass[key]
        }
        for (const key of Object.keys(rendererClass.prototype)) {
            AdjustedRenderer.prototype[key] = rendererClass.prototype[key]
        }
        AdjustedRenderer.parent = this
        return AdjustedRenderer
    }

    render(codeAnnotationManager) {
        const element = this._render(codeAnnotationManager,)
        let classes = `${element.className} rendered ${Utils.camelToKebab(this.constructor.getName())}`
        let {parent} = this.constructor
        while (parent) {
            classes += ` ${Utils.camelToKebab(parent.getName())}`
            parent = parent.parent
        }
        element.className = classes
        return element
    }

    // can be overriden by subclasses to get latest layout info
    // afterShow: (codeAnnotationManager) ->
    //     return @

    _render(codeAnnotationManager) {
        throw new Error(`_render() method must be implemented by '${this.constructor.getName()}'.`)
    }

    isBinary() {
        return this.constructor.isBinary
    }
}
