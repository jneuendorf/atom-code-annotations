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

    # set data and copy file
    set: (codeAnnotationName, asset) ->
        assetName = "#{@_asciiFilename(codeAnnotationName)}#{path.extname(asset)}".toLowerCase()
        @data[codeAnnotationName] = assetName
        # copy asset to local .code-annotations directory
        console.log asset
        fs.copyFileSync(asset, path.join(@dir, assetName))
        return @

    create: (codeAnnotationName) ->
        assetName = "#{@_asciiFilename(codeAnnotationName)}#{path.extname(asset)}".toLowerCase()
        @data[codeAnnotationName] = assetName
        # copy asset to local .code-annotations directory
        console.log asset
        # TODO: create file: path.join(@dir, assetName)
        # fs.copyFileSync(asset, path.join(@dir, assetName))
        return @

    save: () ->
        CSON.writeFileSync(@file, @data)
        return @

    _asciiFilename: (string) ->
        return Utils.escapeNonAscii(string).slice(0, 20)
