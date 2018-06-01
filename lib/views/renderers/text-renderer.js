'use babel'

import React from 'react'

import PropTypes from '../../prop-types'


export default class TextRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = 'Renders plain text'
    static type = 'text'
    static fileExtension = 'txt'

    static getName() {
        return 'TextRenderer'
    }

    render() {
        const {content} = this.props
        return <pre>{content}</pre>
    }
}
