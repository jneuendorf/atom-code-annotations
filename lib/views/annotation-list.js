'use babel'

import React from 'react'
import PropTypes from 'prop-types'


const icons = {
    text: 'file-text',
    html: 'file-text',
    markdown: 'file-text',
    image: 'file-media',
    link: 'link',
}


export default class AnnotationList extends React.PureComponent {
    static propTypes = {
        annotations: PropTypes.array.isRequired,
        selectedIndex: PropTypes.number.isRequired,
        selectAnnotation: PropTypes.func.isRequired,
        deleteAnnotation: PropTypes.func.isRequired,
        editAnnotation: PropTypes.func.isRequired,
    }

    render() {
        const {
            annotations,
            selectedIndex,
            selectAnnotation,
            deleteAnnotation,
            editAnnotation,
        } = this.props
        return <ol className='list-group'>
            {annotations.map((annotation, index) => {
                const {title, type} = annotation
                const isSelected = index === selectedIndex
                const icon = type in icons ? `icon-${icons[type]}` : ''
                return <li
                    className={`two-lines ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAnnotation(index)}
                    key={`${title}_${type}`}
                >
                    <div
                        className='status icon icon-trashcan'
                        onClick={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            deleteAnnotation(index)
                        }}
                    />
                    <div
                        className='status icon icon-pencil'
                        onClick={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            editAnnotation(index)
                        }}
                    />
                    <div className={`primary-line icon ${icon}`}>
                        {title}
                    </div>
                    <div className='secondary-line no-icon'>
                        {type}
                    </div>
                </li>
            })}
        </ol>
    }
}
