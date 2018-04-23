'use babel'

import React from 'react'

import PropTypes from '../prop-types'
import RendererRegistry from '../renderer-registry'
import * as Utils from '../utils'
import {AbortError} from '../errors'


export default class Annotation extends React.PureComponent {
    static propTypes = PropTypes.Annotation

    // @param kwargs {Object} These options are passed to 'createAndOpenTmpFile'.
    static async askForContent(type, title, kwargs) {
        const rendererClass = RendererRegistry.getRendererForType(type)
        if (rendererClass.isBinary) {
            const paths = Utils.chooseFile('Now, choose a file!')
            if (!paths || paths.length === 0) {
                throw new AbortError('No file chosen.')
            }
            return Utils.readFileBase64(paths[0])
        }
        else {
            return Utils.createAndOpenTmpFile(
                `${title}.${rendererClass.fileExtension}`,
                kwargs
            )
        }
    }

    render() {
        const {annotation} = this.props
        if (annotation) {
            const ConcreteComponent = this.getConcreteComponent()
            return <ConcreteComponent {...annotation} />
        }
        return null
    }

    getConcreteComponent() {
        const {annotation: {type}} = this.props
        return RendererRegistry.getRendererForType(type)
    }
}
