# TODO: pass atom required object to required files (by main) in order to save require overhead
{Directory} = require 'atom'
Utils = require './utils'

CodeAnnotations = require "./constants"



module.exports = class CodeAnnotation

    # CONSTRUCTOR
    # TODO: refactor this signature...
    constructor: (codeAnnotationManager, editor, marker, gutter, assetData, assetManager) ->
        @codeAnnotationManager = codeAnnotationManager
        @editor = editor

        @asset = null
        {@line, @name} = assetData
        @assetManager = assetManager

        @element = null
        @gutter = gutter
        @marker = marker
        @decoration = null
        @icon = null
        @renderer = null

        @_init()

    _init: () ->
        gutterIcon = @_createGutterIcon()
        @decoration = @gutter.decorateMarker(@marker, {
            item: gutterIcon
        })
        @_addEventListenersToGutterIcon(gutterIcon)
        @icon = gutterIcon
        return @

    # PRIVATE
    _createGutterIcon: () ->
        return document.createElement("code-annotation-gutter-icon")

    _addEventListenersToGutterIcon: (gutterIcon) ->
        gutterIcon.addEventListener "click", (event) =>
            try
                @show()
            catch error
                atom.notifications.addError(error.message)
        return gutterIcon

    _createWrapper: () ->
        return document.createElement("code-annotation")

    _setAsset: () ->
        assets = @codeAnnotationManager.assetDirectory.getEntriesSync()
        # for asset in assets when asset.getBaseName() is @name
        for asset in assets when asset.getBaseName() is @assetManager.get(@name)
            @asset = asset
        if not @asset?
            throw new Error("No asset found at '#{@codeAnnotationManager.assetDirectory.getPath()}'.")
        console.log @asset
        return @

    _setRenderer: () ->
        for rendererClass in @codeAnnotationManager.renderers
            if Utils.fileHasType(@asset.getBaseName(), rendererClass.fileExtension)
                @renderer = new rendererClass(@asset)
                return @
        throw new Error("Could not find a renderer for asset '#{@name}'.")

    _updateElement: () ->
        # Utils.removeChildNodes(@element)
        # @renderer.setAsset(@asset)
        # @element.appendChild @renderer.render()
        @element = null
        @show()
        return @

    #######################################################################################
    # PUBLIC

    show: () ->
        if not @element?
            @_setAsset()
            @_setRenderer()
            @element = @_createWrapper()
            @element.appendChild @renderer.render()
        @codeAnnotationManager.showContainer(@, @element)
        return @

    hide: () ->
        @codeAnnotationManager.hideContainer()
        return @

    getRenderer: () ->
        return @renderer

    updateName: (newName) ->
        oldName = @name
        if oldName isnt newName
            @assetManager.updateName(oldName, newName)
                .save()
            @name = newName
            @editor.setTextInBufferRange(
                @marker.getBufferRange()
                @line.replace(oldName, newName)
            )
        return @

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
        # save changes
        return @

    delete: () ->
        # strip "CODE-ANNOTATION: " for comment so the name remains for comment semantics
        @editor.setTextInBufferRange(
            @marker.getBufferRange()
            @line.replace(CodeAnnotations.CODE_KEYWORD, " ")
        )
        # remove entry from names.cson + remove asset file from file system
        @assetManager
            .delete @name
            .save()
        # remove gutter marker
        @marker.destroy()
        return @
