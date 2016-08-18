{Directory} = require 'atom'
{$} = require 'atom-space-pen-views'
path = require "path"

Utils = require './utils'
CodeAnnotations = require "./constants"


module.exports = class Annotation

    constructor: (codeAnnotationManager, editorData, assetData, fallbackRenderer) ->
        @codeAnnotationManager = codeAnnotationManager

        {@editor, @marker, gutter} = editorData
        @marker.setProperties({annotation: @})

        {@assetManager, @assetDirectory, @line, @name} = assetData
        @element = null

        @assetFile = null
        @renderer = null
        @fallbackRenderer = fallbackRenderer or null
        @gutterIcon = null

        @_init(gutter)

    _init: (gutter) ->
        @assetFile = @_getAssetFile()
        @renderer = @_getRenderer(@assetFile, @fallbackRenderer)

        gutterIcon = @_createGutterIcon()
        gutter.decorateMarker(@marker, {item: gutterIcon})
        @_addEventListenersToGutterIcon(gutterIcon)
        @gutterIcon = $(gutterIcon)
        return @

    ###########################################################################################
    # PRIVATE
    _createGutterIcon: () ->
        return document.createElement("code-annotation-gutter-icon")

    _addEventListenersToGutterIcon: (gutterIcon) ->
        gutterIcon.addEventListener "click", (event) =>
            return @show()
        return gutterIcon

    _createWrapper: () ->
        return document.createElement("code-annotation")

    _getAssetFile: () ->
        name = @assetManager.get(@name)
        for asset in @assetDirectory.getEntriesSync() when asset.getBaseName() is name
            return asset
        throw new Error("Found no asset for name '#{@name}' at '#{@assetDirectory.getPath()}'.")

    _getRenderer: (assetFile, fallbackRenderer) ->
        filename = assetFile.getBaseName()
        renderer = fallbackRenderer
        maxPriority = -1
        for rendererClass in @codeAnnotationManager.rendererClasses
            {result, priority} = rendererClass.supports(filename)
            if result is true and priority > maxPriority
                renderer = rendererClass
                maxPriority = priority
        if renderer?
            return new renderer(assetFile)
        throw new Error("Found no renderer for asset '#{filename}' of code annotation '#{@name}'.")

    _updateElement: () ->
        @_resetElement()
        @show()
        return @

    _resetElement: () ->
        @element = null
        return @

    ###########################################################################################
    # PUBLIC

    show: () ->
        if not @element?
            @element = @_createWrapper()
            @element.appendChild @renderer.render(@codeAnnotationManager, true)
        @codeAnnotationManager.showContainer(@, @element)
        @renderer.afterShow?(@codeAnnotationManager)
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
        # load asset contents into a TextEditor
        if @renderer.isTextBased()
            atom.workspace.open(@assetFile.getPath()).then (editor) =>
                editor.onDidSave (event) =>
                    @_resetElement()
                    return @
        # choose new file as asset
        else
            paths = Utils.chooseFile()
            if not paths?
                # atom.notifications.addInfo("No new asset chosen.")
                return @

            newAssetPath = paths[0]
            # remove old file if it's of a new type
            if path.extname(newAssetPath).toLowerCase() isnt path.extname(@assetFile.getBaseName())
                @assetManager.delete(@name)

            @assetManager.set(@name, newAssetPath)
                .save()

            @assetFile = @_getAssetFile()
            @renderer = @_getRenderer(@assetFile, @fallbackRenderer)
            @_updateElement()
        return @

    changeType: (rendererClass) ->
        assetName = @assetFile.getBaseName()
        assetName = assetName.replace(path.extname(assetName), ".#{rendererClass.getFileExtension()}")
        @assetManager.renameAsset(@name, assetName)
            .save()
        @assetFile = @assetDirectory.getFile(assetName)
        @renderer = new rendererClass(@assetFile)
        @_updateElement()
        return @

    # removes the annotation from code and file system
    delete: (changeBufferText = true) ->
        if changeBufferText
            # strip "CODE-ANNOTATION: " for comment so the name remains for comment semantics
            @editor.setTextInBufferRange(
                @marker.getBufferRange()
                @line.replace(CodeAnnotations.CODE_KEYWORD, " ")
            )
        # remove entry from names.cson + remove asset file from file system
        @assetManager
            .delete @name
            .save()
        @destroy()
        return @

    # destroys the instance
    destroy: () ->
        @element?.remove()
        # remove gutter marker + decoration (== gutter icon)
        @marker.destroy()
        return @

    # this method is called when the marker becomes invalid
    invalidate: () ->
        @gutterIcon.addClass("invalid")
        return @

    # this method is called when the marker becomes valid
    validate: () ->
        @gutterIcon.removeClass("invalid")
        return @
