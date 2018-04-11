'use babel'

import {concreteRenderers} from './asset-renderers'


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
        renderers: {
            order: 2,
            type: 'object',
            description: 'Annotations can only be displayed if the according renderer is loaded',
            properties: (function() {
                const renderers = {}
                for (const [name, clss] of Object.entries(concreteRenderers)) {
                    if (name !== 'AssetRenderer') {
                        renderers[`load${name}`] = {
                            type: 'boolean',
                            default: true,
                            title: `load ${name}`,
                            description: clss.description,
                        }
                    }
                }
                return renderers
            })()
        },
        fallbackRenderer: {
            order: 3,
            type: 'string',
            default: 'TextRenderer',
            enum: Object.keys(concreteRenderers).sort(),
            description: 'How to render unsupported assets'
        },
        gutterPriority: {
            order: 4,
            type: 'integer',
            default: 500
        }
    }
}


const get = function(key) {
    return atom.config.get(`code-annotations.${key}`)
}

const set = function(key, val) {
    atom.config.set(`code-annotations.${key}`, val)
}

// TODO enhance this somehow
const defineProperties = function(configData, prefix='') {
    if (prefix.length > 0) {
        prefix += '.'
    }
    for (const name in configData) {
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
        }
        else {
            defineProperties(config.properties, name)
        }
    }
    return configData
}

defineProperties(Config.configData)


export default Config
