'use babel'

import Renderers from './views/renderers'
import {dict} from './utils'


export const config = {
    gutter: {
        order: 1,
        type: 'object',
        title: 'Gutter',
        properties: {
            icon: {
                order: 1,
                type: 'string',
                default: 'pin',
                title: 'Icon',
                description: 'See the Styleguide for all supported icons.',
            },
            priority: {
                order: 2,
                type: 'integer',
                default: 500,
                title: 'Priority',
            },

        },
    },
    container: {
        order: 2,
        type: 'object',
        title: 'Container',
        properties: {
            height: {
                order: 1,
                type: 'string',
                default: '80%',
                title: 'Height',
                description: 'The height as CSS property value.',
            },
            width: {
                order: 2,
                type: 'string',
                default: '80%',
                title: 'Width',
                description: 'The width as CSS property value.',
            },
            backdrop: {
                order: 3,
                type: 'boolean',
                default: true,
                title: 'Show backdrop?',
                description: 'Show a translucent background when the container is open that closes the container on click.',
            },
            listWidth: {
                order: 4,
                type: 'string',
                default: '250px',
                title: 'List width',
                description: 'The width of the container\' annotation list on the left as CSS property value.',
            }
        },
    },
    dialogs: {
        order: 3,
        type: 'object',
        title: 'Dialogs',
        properties: {
            showReplaceConfirm: {
                type: 'boolean',
                default: true,
                title: 'Show dialog before replacing an annotation?',
            },
            showDeleteConfirm: {
                type: 'boolean',
                default: true,
                title: 'Show dialog before deleting an annotation?',
            },
        },
    },
    renderers: {
        order: 4,
        type: 'object',
        title: 'Renderers',
        description: 'Annotations can only be displayed if the according renderer is loaded',
        properties: dict(
            Object.values(Renderers)
            .filter(renderer => renderer.getName() !== 'FallbackRenderer')
            .map(renderer => {
                const name = renderer.getName()
                return [`load${name}`, {
                    type: 'boolean',
                    default: true,
                    title: `load ${name}`,
                    description: renderer.description,
                }]
            })
        ),
    },
}


export const get = key => atom.config.get(`code-annotations.${key}`)

const getDefault = key => atom.config.getSchema(`code-annotations.${key}`).default

const cssNumberRegex = /^([0-9]*[.])?[0-9]+(px|%)$/
export const getValidCssNumbers = (...keys) => {
    return keys.map(key => {
        const value = get(key)
        return (
            cssNumberRegex.test(value)
            ? value
            : getDefault(key)
        )
    })
}
