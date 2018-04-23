'use babel'

import {TextEditor} from 'atom'
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

export const CodeAnnotationContainer = {
    annotations: PropTypes.array.isRequired,
    editor: PropTypes.instanceOf(TextEditor),
    hidden: PropTypes.bool,
    deleteAnnotation: PropTypes.func,
    editAnnotation: PropTypes.func,
}


export default {
    Annotation,
    Renderer,
}
