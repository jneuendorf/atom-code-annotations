CSON = require "season"

CodeAnnotations = require "./constants"


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
        @path = "#{path}/#{CodeAnnotations.ASSET_NAMES_FILE}"
        @data = CSON.readFileSync(@path)
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

    delete: (name) ->
        if @data[name]?
            delete @data[name]
            return @
        throw new Error("code-annotations: There is no entry with name '#{name}'.")

    update: (name, asset) ->
        if @data[name]?
            @data[name] = asset
            return @
        throw new Error("code-annotations: There is no entry with name '#{name}'.")

    # == upsert: does not throw errors...just overwrites ()
    set: (name, asset) ->
        @data[name] = asset
        return @

    save: () ->
        CSON.writeFileSync(@path, @data)
        return @
