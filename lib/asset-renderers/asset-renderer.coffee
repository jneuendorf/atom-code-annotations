Utils = require '../utils'

module.exports = class AssetRenderer

    @parent: null
    # string or array of strings. must be lower case. must not begin with a dot
    @fileExtension: null
    # asset kind: text-based -> directly editable, not text-based (= binary) -> replaceable only
    @isTextBased: null
    @description: null

    # CONSTRUCTOR
    constructor: (asset) ->
        @asset = asset

    @getName: () ->
        return @name

    # this class method checks if the given class has all necessary class and instance methods
    # and if it does
    @ensureSameApi: (rendererClass) ->
        if rendererClass.prototype instanceof AssetRenderer
            return rendererClass

        isValid = rendererClass::_render instanceof Function and
            rendererClass.getName instanceof Function and
            rendererClass.fileExtension? and
            typeof rendererClass.isTextBased is "boolean"

        if not isValid
            return null

        # minimal api is ok => create new class as subclass of AssetRenderer to make sure entire api is there
        # note that coffeescript's extends is in-place
        class AdjustedRenderer extends @

        for key in Object.keys(rendererClass)
            AdjustedRenderer[key] = rendererClass[key]
        for key in Object.keys(rendererClass.prototype)
            AdjustedRenderer::[key] = rendererClass::[key]
        AdjustedRenderer.parent = @
        return AdjustedRenderer

    @supports: (filename) ->
        regex = /\./g
        if typeof @fileExtension is "string"
            fileExtensions = [@fileExtension]
        else
            fileExtensions = @fileExtension
        for fileExtension in fileExtensions when filename.slice(-fileExtension.length - 1).toLowerCase() is ".#{fileExtension}"
            return {
                priority: fileExtension.split(".").length
                result: true
            }
        return {
            priority: 0
            result: false
        }

    @getFileExtension: () ->
        if typeof @fileExtension is "string"
            return @fileExtension
        return @fileExtension[0]

    render: (codeAnnotationManager, clearCache = false) ->
        element = @_render(codeAnnotationManager, clearCache)
        classes = "#{element.className} rendered #{Utils.camelToKebab(@constructor.getName())}"
        parent = @constructor.parent
        while parent?
            classes += " #{Utils.camelToKebab(parent.getName())}"
            parent = parent.parent
        element.className = classes
        return element

    # can be overriden by subclasses to get latest layout info
    # afterShow: (codeAnnotationManager) ->
    #     return @

    _render: (codeAnnotationManager, clearCache) ->
        throw new Error("_render() method must be implemented by '#{@constructor.getName()}'.")

    isTextBased: () ->
        return @constructor.isTextBased

    getFileExtension: () ->
        return @constructor.fileExtension
