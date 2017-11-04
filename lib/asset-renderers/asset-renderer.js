'use babel'

import Utils from '../utils'

export default class AssetRenderer {
    constructor(asset) {
        this.asset = asset
    }

    getName() {
        return this.name
    }

    // this class method checks if the given class has all necessary class and instance methods
    // and if it does
    ensureSameApi(rendererClass) {
        if (rendererClass.prototype instanceof AssetRenderer) {
            return rendererClass
        }

        const isValid = rendererClass.prototype._render instanceof Function &&
            rendererClass.getName instanceof Function &&
            rendererClass.fileExtension &&
            (typeof rendererClass.isTextBased === 'boolean')

        if (!isValid) {
            return null
        }

        // minimal api is ok => create new class as subclass of AssetRenderer to make sure entire api is there
        // note that coffeescript's extends is in-place
        class AdjustedRenderer extends this {}

        for (var key of Object.keys(rendererClass)) {
            AdjustedRenderer[key] = rendererClass[key]
        }
        for (key of Object.keys(rendererClass.prototype)) {
            AdjustedRenderer.prototype[key] = rendererClass.prototype[key]
        }
        AdjustedRenderer.parent = this
        return AdjustedRenderer
    }

    supports(filename) {
        let fileExtensions
        console.log(filename)
        console.log(this.constructor.fileExtension)
        const regex = /\./g
        if (typeof this.constructor.fileExtension === 'string') {
            fileExtensions = [this.constructor.fileExtension]
        } else {
            fileExtensions = this.constructor.fileExtension
        }
        for (let fileExtension of fileExtensions) {
            if (filename.slice(-fileExtension.length - 1).toLowerCase() === `.${fileExtension}`) {
                return {
                    priority: fileExtension.split('.').length,
                    result: true
                }
            }
        }
        return {
            priority: 0,
            result: false
        }
    }

    getFileExtension() {
        if (typeof this.constructor.fileExtension === 'string') {
            return this.constructor.fileExtension
        }
        return this.constructor.fileExtension[0]
    }

    render(codeAnnotationManager, clearCache) {
        if (!clearCache) { clearCache = false }
        const element = this._render(codeAnnotationManager, clearCache)
        let classes = `${element.className} rendered ${Utils.camelToKebab(this.constructor.getName())}`
        let { parent } = this.constructor
        while (parent != null) {
            classes += ` ${Utils.camelToKebab(parent.getName())}`;
            ({ parent } = parent)
        }
        element.className = classes
        return element
    }

    // can be overriden by subclasses to get latest layout info
    // afterShow: (codeAnnotationManager) ->
    //     return @

    _render(codeAnnotationManager, clearCache) {
        throw new Error(`_render() method must be implemented by '${this.constructor.getName()}'.`)
    }

    isTextBased() {
        return this.constructor.isTextBased
    }

    getFileExtension() {
        return this.constructor.fileExtension
    }
};
AssetRenderer.parent = null
// string or array of strings. must be lower case. must not begin with a dot
AssetRenderer.fileExtension = null
// asset kind: text-based -> directly editable, not text-based (= binary) -> replaceable only
AssetRenderer.isTextBased = null
AssetRenderer.description = null
