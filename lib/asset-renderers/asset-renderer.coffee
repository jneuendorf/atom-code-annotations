module.exports = class AssetRenderer

    @parent: null
    @fileExtension: null
    # asset kind: text-based -> directly editable, not text-based (= binary) -> replaceable only
    @isTextBased: null

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

    render: () ->
        throw new Error("AssetRenderer::render() must be implemented by '#{@constructor.name}'!")

    isTextBased: () ->
        return @constructor.isTextBased
