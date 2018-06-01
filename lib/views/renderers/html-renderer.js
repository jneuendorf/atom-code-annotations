'use babel'

import React from 'react'

import PropTypes from '../../prop-types'

export default class HtmlRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = 'Renders HTML inline (rich text)'
    static type = 'html'
    static fileExtension = 'html'

    static getName() {
        return 'HtmlRenderer'
    }

    render() {
        const {content} = this.props
        return <div dangerouslySetInnerHTML={{__html: content}} />
    }
}
