'use babel'

import PropTypes from 'prop-types'


export const Annotation = {
    annotation: PropTypes.shape({
        lineNumber: PropTypes.number,
        title: PropTypes.string,
        content: PropTypes.string,
        type: PropTypes.string,
    }),
}

export const Renderer = {
    annotation: Annotation.annotation.isRequired,
}


export default {
    Annotation,
    Renderer,
}
