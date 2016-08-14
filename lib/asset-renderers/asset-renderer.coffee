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

    @isSubclassOf: (clss) ->
        if clss is @
            return false
        c = @
        while c.parent?
            c = c.parent
            if c is clss
                return true
        return false

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
        classes = "#{element.className} rendered #{Utils.camelToKebab(@constructor.name)}"
        parent = @constructor.parent
        while parent?
            classes += " #{Utils.camelToKebab(parent.name)}"
            parent = parent.parent
        element.className = classes
        return element

    # can be overriden by subclasses to get latest layout info
    # afterShow: (codeAnnotationManager) ->
    #     return @

    _render: (codeAnnotationManager, clearCache) ->
        throw new Error("_render() method must be implemented by '#{@constructor.name}'.")

    isTextBased: () ->
        return @constructor.isTextBased

    getFileExtension: () ->
        return @constructor.fileExtension

    setAsset: (asset) ->
        @asset = asset
        return @
