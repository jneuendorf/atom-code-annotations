'use babel'

// This file contains prop types that relate to each other. Thus keeping
// them in one place makes it easier and safe to change those props.

import PropTypes from 'prop-types'


const annotationShape = {
    lineNumber: PropTypes.number,
    title: PropTypes.string,
    content: PropTypes.string,
    type: PropTypes.string,
}

export const Annotation = {
    annotation: PropTypes.shape(annotationShape),
}

export const Renderer = annotationShape


export default {
    Annotation,
    Renderer,
}
