class Config
    @configData:
        gutterPriority:
            type: "integer"
            default: 500
        showReplaceConfirmDialog:
            type: "boolean"
            default: true
        showDeleteConfirmDialog:
            type: "boolean"
            default: true
        renderers:
            type: "object"
            properties:
                loadImageRenderer:
                    type: "boolean"
                    default: true
                loadHtmlRenderer:
                    type: "boolean"
                    default: true
                loadTextRenderer:
                    type: "boolean"
                    default: true

    @get: (key) ->
        return atom.config.get("code-annotations.#{key}")

    @set: (key, val) ->
        atom.config.set("code-annotations.#{key}", val)
        return @

defineProperties = (configData, prefix = "") ->
    for name, config of configData
        if not config.properties?
            do (name, prefix) ->
                if prefix.length > 0
                    prefix += "."
                Object.defineProperty Config, name, {
                    get: () ->
                        return Config.get(prefix + name)
                    set: (val) ->
                        return Config.set(prefix + name, val)
                }
        else
            defineProperties(config.properties, name)
    return configData


defineProperties(Config.configData)
module.exports = Config
