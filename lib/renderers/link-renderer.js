'use babel'

import React from 'react'

import PropTypes from '../prop-types'

// TODO: Add loader icon: https://stackoverflow.com/a/16485533/6928824
// TODO: Add message on load error: https://stackoverflow.com/a/18552771/6928824
// TODO: Support local file URLs in project (using a placeholder) e.g.
//       file://${root}/annotation-contents/my-stuff.html
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
        const {content} = this.props
        return <webview src={content} />
    }
}
