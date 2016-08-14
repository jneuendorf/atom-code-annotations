AssetRenderer = require './asset-renderer'

module.exports = class FrameRenderer extends AssetRenderer

    @parent: AssetRenderer

    # CONSTRUCTOR
    constructor: (asset) ->
        super(asset)
        @frameUrl = null
        @frame = null

    # this method must be implemented by subclasses
    # _baseUrl: (clearCache) ->
    #     return "some path"

    _createSrcElement: () ->
        return document.createElement("iframe")

    _buildUrl: (codeAnnotationManager, clearCache) ->
        container = codeAnnotationManager.codeAnnotationContainer
        return """#{@_baseUrl(clearCache)}
            ?width=#{container.width}
            &height=#{container.height}
            &textColor=#{codeAnnotationManager.textColor}
            &backgroundColor=#{codeAnnotationManager.backgroundColor}""".replace(/\s/g, "")

    _render: (codeAnnotationManager, clearCache) ->
        frame = @_createSrcElement()
        frame.src = @_buildUrl(codeAnnotationManager, clearCache)
        @frame = frame
        return frame

    # update url if get parameters have changed
    afterShow: (codeAnnotationManager) ->
        frameUrl = @_buildUrl(codeAnnotationManager)
        if frameUrl isnt @frameUrl
            @frameUrl = frameUrl
            @frame.src = frameUrl
        return @
