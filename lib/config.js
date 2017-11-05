'use babel'

import * as Renderers from './asset-renderers/all-renderers'

const Config = {
    configData: {
        dialogs: {
            order: 1,
            type: 'object',
            properties: {
                showReplaceConfirmDialog: {
                    type: 'boolean',
                    default: true,
                    title: 'before replacing an existing asset'
                },
                showDeleteConfirmDialog: {
                    type: 'boolean',
                    default: true,
                    title: 'before deleting a code annotation'
                }
            }
        },
        manuallyLoadCodeAnnotations: {
            order: 2,
            type: 'boolean',
            default: false,
            description: 'Changes require reloading the package'
        },
        renderers: {
            order: 3,
            type: 'object',
            description: 'Annotations can only be displayed if the according renderer is loaded',
            properties: (function() {
                const renderers = {}
                for (let name in Renderers) {
                    let clss = Renderers[name]
                    if (name !== 'AssetRenderer') {
                        renderers[`load${name}`] = {
                            type: 'boolean',
                            default: true,
                            title: `load ${name}`,
                            description: clss.description
                        }
                    }
                }
                return renderers
            })()
        },
        fallbackRenderer: {
            order: 4,
            type: 'string',
            default: 'TextRenderer',
            enum: ['none'].concat(((() => {
                const result = []
                for (let name in Renderers) {
                    result.push(name)
                }
                return result
            })()).sort()),
            description: 'How to render unsupported assets'
        },
        gutterPriority: {
            order: 5,
            type: 'integer',
            default: 500
        }
    }
}
export default Config

function get(key) {
    return atom.config.get(`code-annotations.${key}`)
}

function set(key, val) {
    atom.config.set(`code-annotations.${key}`, val)
}

// TODO
var defineProperties = function(configData, prefix) {
    if (!prefix) { prefix = '' }
    if (prefix.length > 0) {
        prefix += '.'
    }
    for (let name in configData) {
        const config = configData[name]
        if (!config.properties) {
            Object.defineProperty(Config, name, {
                get() {
                    return get(prefix + name)
                },
                set(val) {
                    return set(prefix + name, val)
                }
            })
        } else {
            defineProperties(config.properties, name)
        }
    }
    return configData
}

defineProperties(Config.configData)
