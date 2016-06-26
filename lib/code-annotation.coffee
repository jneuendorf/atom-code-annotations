{Directory} = require 'atom'
Utils = require './utils'
# {Emitter, Disposable, CompositeDisposable} = require 'event-kit'

module.exports = class CodeAnnotation

    # CONSTRUCTOR
    constructor: (codeAnnotations, marker, decoration, icon, assetData) ->
        @asset = null
        @assetData = assetData
        @codeAnnotations = codeAnnotations
        @createdAt = Date.now()
        @decoraion = decoration
        @element = null
        @icon = icon
        @marker = marker
        # @name =
        @renderer = null
        @init()

    init: () ->
        @_bindEventHandlers()
        return @

    # PRIVATE
    _bindEventHandlers: () ->
        @icon.addEventListener "click", (event) =>
            @codeAnnotations.setCurrentCodeAnnotation(@)
            return @show()
        return @

    _createWrapper: () ->
        return document.createElement("code-annotation")

    _setAsset: () ->
        assets = @codeAnnotations.assetDirectory.getEntriesSync()
        for asset in assets when asset.getBaseName() is @assetData.name
            @asset = asset
        if not @asset?
            throw new Error("No asset found...")
        console.log @asset
        return @

    _setRenderer: () ->
        for rendererClass in @codeAnnotations.renderers
            if Utils.fileHasType(@assetData.name, rendererClass.fileExtension)
                @renderer = new rendererClass(@asset)
        if not @renderer?
            throw new Error("Could not find a renderer for asset '#{@assetData.name}'.")
        return @

    _updateElement: () ->
        # Utils.removeChildNodes(@element)
        # @renderer.setAsset(@asset)
        # @element.appendChild @renderer.render()
        @element = null
        @show()
        return @

    _updateAssetNameInCode: () ->
        range = @marker.getBufferRange()
        return @

    # PUBLIC
    # needed for being used as a key in an object
    toString: () ->
        return "code-annotation-#{@createdAt}"

    show: () ->
        if not @element?
            @_setAsset()
            @_setRenderer()
            @element = @_createWrapper()
            @element.appendChild @renderer.render()
        @codeAnnotations.showContainer(@element)
        return @

    hide: () ->
        @codeAnnotations.hideContainer()
        return @

    getRenderer: () ->
        return @renderer

    edit: () ->
        console.log "editing code annotation...."
        if not @renderer
            throw new Error("Cannot edit a code annotation without a renderer. If you see this message please report a bug.")

        if @renderer.isTextBased()
            # load asset contents into new tab
            atom.workspace.open(@asset.getPath())
        else
            paths = Utils.chooseFile()
            if not paths?
                atom.notifications.addInfo("No new asset chosen.")
                return @
            sourcePath = paths[0]
            if not Utils.fileHasType(sourcePath, @renderer.getFileExtension())
                atom.notifications.addError("Chosen asset '#{sourcePath}' is not supported by #{@renderer.constructor.name}.")
                return @
            console.log "updating asset to #{sourcePath}..."
            destPath = @asset.getPath()
            sourceParts = sourcePath.split(".")
            destParts = destinationPath.split(".")
            destParts[destParts.length - 1] = sourceParts[sourceParts.length - 1]
            sourcePath = sourceParts.join(".")
            destPath = destParts.join(".")
            Utils.copyFile(sourcePath, destPath)
            @_updateElement()
            @_updateAssetNameInCode()
        # save changes
        return @
