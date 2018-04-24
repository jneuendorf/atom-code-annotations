'use babel'

import React from 'react'

import AnnotationList from './annotation-list'
import Annotation from './annotation'
import PropTypes from '../prop-types'
// import AnnotationsDb from '../annotations-db'
import {DELETE_CONFIRM_MESSAGE} from '../constants'
import Config from '../config'
import * as Utils from '../utils'
import {AbortError} from '../errors'


export default class CodeAnnotationContainer extends React.PureComponent {
    static propTypes = PropTypes.CodeAnnotationContainer

    static defaultProps = {
        hidden: true,
        annotations: [],
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        console.log('getDerivedStateFromProps', nextProps, prevState)
        if (nextProps.hidden !== prevState.hidden) {
            return {
                hidden: nextProps.hidden,
            }
        }
        return null
    }

    state = {
        hidden: true,
        selectedIndex: 0,
    }

    constructor(props) {
        super(props)
        // Must be bound explicitly because async mymethod = () => {} does not work...
        // See https://babeljs.io/docs/plugins/transform-class-properties/
        this.editAnnotation = this.editAnnotation.bind(this)
    }

    render() {
        const {annotations} = this.props
        const {hidden, selectedIndex} = this.state
        return <div
            className='annotation-container'
            ref={this.setElement}
            style={{display: hidden ? 'none' : 'block'}}
               >
            <div style={{width: '250px', float: 'left', padding: '5px 10px 5px 5px'}}>
                <div className='select-list annotations'>
                    <AnnotationList
                        annotations={annotations}
                        selectedIndex={selectedIndex}
                        selectAnnotation={this.selectAnnotation}
                        deleteAnnotation={this.deleteAnnotation}
                        editAnnotation={this.editAnnotation}
                    />
                </div>
            </div>
            <div style={{width: 'calc(100% - 250px)', float: 'left', padding: '5px 5px 5px 10px', height: '100%'}}>
                <div className='hidden' />
                <div className='top block'>
                    <div className='row'>
                        <div className='buttons'>
                            <button
                                className='inline-block btn icon icon-x disappear'
                                onClick={this.hide}
                            >
                                Close
                            </button>
                            <div style={{clear: 'both'}} />
                        </div>
                    </div>
                </div>
                <div className='bottom block content' style={{height: 'calc(100% - 40px)'}}>
                    <Annotation annotation={annotations[selectedIndex]} />
                </div>
            </div>
            <div style={{clear: 'both'}} />
        </div>
    }

    setElement = element => {
        this.element = element
    }

    selectAnnotation = index => {
        this.setState({selectedIndex: index})
    }

    deleteAnnotation = index => {
        if (Config.showDeleteConfirmDialog && !Utils.confirm({message: DELETE_CONFIRM_MESSAGE})) {
            return
        }

        const {annotations, editor, deleteAnnotation} = this.props
        const {selectedIndex} = this.state

        const {lineNumber} = annotations[0]
        const numRemainingAnnotations = annotations.length - 1

        if (selectedIndex > 0) {
            if (
                // Previously selected annotation stays selected.
                index < selectedIndex
                // Last annotation was deleted.
                || (index === selectedIndex && index === numRemainingAnnotations)
            ) {
                this.selectAnnotation(selectedIndex - 1)
            }
        }
        deleteAnnotation(editor, lineNumber, index)
    }

    async editAnnotation(index) {
        const {annotations, editor, editAnnotation} = this.props
        const {lineNumber, title, content, type} = annotations[index]
        try {
            const newContent = await Annotation.askForContent(type, title, {content})
            console.log(newContent)
            editAnnotation(editor, lineNumber, index, newContent)
        }
        catch (error) {
            if (error instanceof AbortError) {
                atom.notifications.addInfo('Changes discarded.')
            }
            else {
                throw error
            }
        }
    }

    show = () => {
        this.setState({hidden: false})
    }

    hide = () => {
        this.setState({hidden: true})
    }
}
