'use babel'

import React from 'react'

import PropTypes from '../prop-types'
import RendererRegistry from '../renderer-registry'


export default class Annotation extends React.PureComponent {
    static propTypes = PropTypes.Annotation

    render() {
        const {annotation} = this.props
        if (annotation) {
            const ConcreteComponent = this.getConcreteComponent()
            return <ConcreteComponent {...this.props} />
        }
        return null
    }

    getConcreteComponent() {
        const {annotation: {type}} = this.props
        return RendererRegistry.getRendererForType(type)
    }
}
