CSON = require "season"
fs = require "fs-plus"
path = require "path"

CodeAnnotations = require "./constants"
Utils = require "./utils"

###
# This class represents the assets belonging to a project folder.
# That means the contents of the .names.cson file as well as the asset files themselves.
# @class AssetManager
###
module.exports = class AssetManager

    constructor: (path) ->
        @dir = path
        @file = "#{path}/#{CodeAnnotations.ASSET_NAMES_FILE}"
        @data = CSON.readFileSync(@file)

    getAssetDirectoryPath: () ->
        return @dir

    getNamesFilePath: () ->
        return @file

    has: (name) ->
        return @data[name]?

    get: (name) ->
        return @data[name] or null

    add: (name, asset) ->
        if not @data[name]?
            @data[name] = asset
            return @
        throw new Error("code-annotations: Entry with name '#{name}' already exists.")

    delete: (codeAnnotationName) ->
        if @data[codeAnnotationName]?
            fs.removeSync(path.join(@dir, @data[codeAnnotationName]))
            delete @data[codeAnnotationName]
            return @
        throw new Error("code-annotations: There is no entry with name '#{codeAnnotationName}'.")

    updateName: (oldName, newName) ->
        if @has(oldName)
            @data[newName] = @data[oldName]
            delete @data[oldName]
        return @

    renameAsset: (codeAnnotationName, newAssetName) ->
        asset = @get(codeAnnotationName)
        fs.moveSync(path.join(@dir, @data[codeAnnotationName]), path.join(@dir, newAssetName))
        @data[codeAnnotationName] = newAssetName
        return @

    # returns if an annotation was replace
    move: (codeAnnotationName, targetAssetManager) ->
        targetAssetManager.set(codeAnnotationName, path.join(@dir, @data[codeAnnotationName]))
            .save()
        @delete(codeAnnotationName)
            .save()
        return @

    # set data and copy file
    set: (codeAnnotationName, asset) ->
        assetName = "#{@_asciiFilename(codeAnnotationName)}#{path.extname(asset)}".toLowerCase()
        @data[codeAnnotationName] = assetName
        # copy asset to local .code-annotations directory
        fs.copyFileSync(asset, path.join(@dir, assetName))
        return @

    createFromName: (codeAnnotationName) ->
        assetName = "#{@_asciiFilename(codeAnnotationName)}.txt".toLowerCase()
        @data[codeAnnotationName] = assetName
        # create asset in local .code-annotations directory
        fs.writeFileSync(path.join(@dir, assetName), "")
        return @

    save: () ->
        CSON.writeFileSync(@file, @data)
        return @

    _asciiFilename: (string) ->
        return Utils.escapeNonAscii(string).slice(0, 20)
