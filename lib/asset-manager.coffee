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

    _assetManagers = []

    @findManagersForAsset: (name) ->
        return (instance for instance in _assetManagers when instance.has(name))

    # tries to set an entry to the correct AssetManager instance assuming that duplicate names are improbable
    # @set: (name, asset) ->
    #     managers = @findManagersForAsset(name)
    #     if managers.length is 1
    #         managers[0].set(name, asset)
    #         return @
    #     throw new Error("code-annotations: No managers were found for name '#{name}'.")
    #
    # @delete: (name) ->
    #     managers = @findManagersForAsset(name)
    #     if managers.length is 1
    #         managers[0].delete(name)
    #         return @
    #     throw new Error("code-annotations: No managers were found for name '#{name}'.")

    @_delegate: (funName, args...) ->
        [name] = args
        managers = @findManagersForAsset(name)
        if managers.length is 1
            managers[0][funName](args...)
            return @
        throw new Error("code-annotations: No managers were found for name '#{name}'.")

    for funName in ["set", "delete"]
        @[funName] = do (funName) =>
            return (args...) =>
                return @_delegate(funName, args...)


    constructor: (path) ->
        @dir = path
        @file = "#{path}/#{CodeAnnotations.ASSET_NAMES_FILE}"
        @data = CSON.readFileSync(@file)
        _assetManagers.push(@)

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

    update: (name, asset) ->
        if @data[name]?
            @data[name] = asset
            return @
        throw new Error("code-annotations: There is no entry with name '#{name}'.")

    updateName: (oldName, newName) ->
        if @has(oldName)
            @data[newName] = @data[oldName]
            delete @data[oldName]
        return @

    # == upsert: does not throw errors...just overwrites ()
    set: (codeAnnotationName, asset) ->
        # basename = path.basename(asset)
        assetName = "#{@_asciiFilename(codeAnnotationName)}#{path.extname(asset)}"
        @data[codeAnnotationName] = assetName
        # copy asset to local .code-annotations directory
        # fs.copyFileSync()
        console.log asset
        fs.copyFileSync asset, path.join(@dir, assetName)
        # @save()
        return @

    save: () ->
        CSON.writeFileSync(@file, @data)
        return @

    _asciiFilename: (string) ->
        return Utils.escapeNonAscii(string).slice(0, 20)
