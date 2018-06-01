'use babel'

import {isValidElementType} from 'react-is'

import builtIntRenderers from './views/renderers'
import {ValueError} from './errors'
import {get as getConfig} from './config'
import {defaultLogger as logger} from './logging'


export default class RendererRegistry {
    static renderers = []
    static fallbackRenderer = null

    static registerBuiltIns() {
        const {FallbackRenderer, ...renderers} = builtIntRenderers
        const shouldRegister = renderer =>
            getConfig(`renderers.load${renderer.getName()}`)
        for (const renderer of Object.values(renderers)) {
            if (shouldRegister(renderer)) {
                this.register(renderer)
            }
        }
        logger.log('registered the following renderers', this.renderers)
        this.fallbackRenderer = FallbackRenderer
    }

    static register(renderer) {
        if (this._isValid(renderer)) {
            if (this.renderers.includes(renderer)) {
                logger.warn('renderer already registered', renderer)
            }
            else {
                this.renderers = [...this.renderers, renderer]
            }
        }
        else {
            throw new ValueError('')
        }
    }

    static _isValid(renderer) {
        return (
            isValidElementType(renderer)
            && typeof(renderer.getName) === 'function'
            && typeof(renderer.type) === 'string'
            && typeof(renderer.isBinary) === 'boolean'
            && typeof(renderer.description) === 'string'
            && typeof(renderer.fileExtension) === 'string'
        )
    }

    static getRenderers() {
        return [...this.renderers]
    }

    static getRendererForType(type) {
        const renderers = (
            this.getRenderers()
            .filter(component => component.type === type)
            .sort((a, b) => a.priority - b.priority)
        )
        return renderers[0] || this.fallbackRenderer
    }
}
