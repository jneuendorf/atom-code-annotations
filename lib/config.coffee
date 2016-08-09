Renderers = require "./asset-renderers/all-renderers"


class Config
    @configData:
        dialogs:
            order: 1
            type: "object"
            properties:
                showReplaceConfirmDialog:
                    type: "boolean"
                    default: true
                    title: "before replacing an existing asset"
                showDeleteConfirmDialog:
                    type: "boolean"
                    default: true
                    title: "before deleting a code annotation"
        manuallyLoadCodeAnnotations:
            order: 2
            type: "boolean"
            default: false
            description: "Changes require reloading the package"
        renderers:
            order: 3
            type: "object"
            description: "Annotations can only be displayed if the according renderer is loaded"
            properties: do () ->
                renderers = {}
                for name, clss of Renderers when name isnt "AssetRenderer"
                    renderers["load#{name}"] =
                        type: "boolean"
                        default: true
                        title: "load #{name}"
                        description: clss.description
                return renderers
        fallbackRenderer:
            order: 4
            type: "string"
            default: "TextRenderer"
            enum: ["none"].concat((name for name, clss of Renderers).sort())
            description: "How to render unsupported assets"
        gutterPriority:
            order: 5
            type: "integer"
            default: 500

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
