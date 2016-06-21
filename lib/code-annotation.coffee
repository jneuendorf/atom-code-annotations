{Directory} = require 'atom'
Utils = require './utils'


module.exports = class CodeAnnotation

    # CONSTRUCTOR
    constructor: (codeAnnotations, marker, decoration, icon, assetData) ->
        @codeAnnotations = codeAnnotations
        @marker = marker
        @decoraion = decoration
        @icon = icon
        @assetData = assetData
        @createdAt = Date.now()
        @renderer = null
        @element = null
        @asset = null
        @init()

    init: () ->
        @_bindEventHandlers()
        return @

    # PRIVATE
    _bindEventHandlers: () ->
        @icon.addEventListener "click", (event) =>
            console.log "clicked on the pin!!!"
            # 1. find according asset (to display)
            # 2. get asset file type
            # 3. get according renderer
            # 4. use renderer to create dom element
            # icon.appendChild renderer.render()
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
        # get asset associated with the pin that was just clicked
        # get renderer for asset
        # according to renderer's isTextBased do:
        if @renderer.isTextBased()
            # load asset contents into new tab
            atom.workspace.open(@asset.getPath())
        else
            # show 'choose file' dialog
        # save changes
        return @
