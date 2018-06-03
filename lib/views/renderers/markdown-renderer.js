'use babel'

import React from 'react'
import Markdown from 'react-markdown'

import PropTypes from '../../prop-types'


export default class MarkdownRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = 'Renders Markdown'
    static type = 'markdown'
    static fileExtension = 'md'

    static getName() {
        return 'MarkdownRenderer'
    }

    render() {
        const {content} = this.props
        return <Markdown source={content} />
    }
}
