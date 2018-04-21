'use babel'

import React from 'react'

import PropTypes from '../prop-types'

export default class LinkRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = 'Shows the web page belonging to a URL'
    static type = 'link'
    static fileExtension = 'txt'

    static getName() {
        return 'LinkRenderer'
    }

    render() {
        const {annotation: {content}} = this.props
        return <webview src={content} />
    }
}
