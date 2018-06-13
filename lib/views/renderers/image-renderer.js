'use babel'

import React from 'react'

import PropTypes from '../../prop-types'


// ImageRenderer supports chrome's native image support.
// For details see https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
export default class ImageRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = true
    static description = 'Renders images as &lt;img&gt; tags (currently supports png, gif, jpg and bmp)'
    static type = 'image'
    static fileExtension = 'png'

    static getName() {
        return 'ImageRenderer'
    }

    render() {
        const {content} = this.props
        return <div className='image-wrapper'>
            <img src={content} />
        </div>
    }
}
