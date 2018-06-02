'use babel'

import React from 'react'
import PropTypes from 'prop-types'

import AnnotationList from './annotation-list'
import Annotation from './annotation'
import AnnotationsDb from '../annotations-db'
import {DELETE_CONFIRM_MESSAGE} from '../constants'
import * as Config from '../config'
import * as Utils from '../utils'
import {AbortError} from '../errors'


export default class CodeAnnotationContainer extends React.PureComponent {
    static propTypes = {
        deleteAnnotation: PropTypes.func.isRequired,
        editAnnotation: PropTypes.func.isRequired,
    }

    state = {
        hidden: true,
        selectedIndex: 0,
        annotations: [],
    }
    previouslyFocusedElement = null

    render() {
        const {annotations, hidden, selectedIndex} = this.state
        if (hidden || annotations.length === 0) {
            return null
        }
        const [listWidth, width, height] = Config.getValidCssNumbers(
            'container.listWidth',
            'container.width',
            'container.height',
        )

        return [
            this.renderBackdrop(),
            <div
                key='container'
                className='annotation-container'
                ref={this.setElement}
                // Setting a tabIndex makes the element focusable.
                // See https://stackoverflow.com/a/1600194/6928824
                tabIndex='0'
                style={{
                    left: `calc(50% - ${width}/2)`,
                    right: `calc(50% - ${width}/2)`,
                    top: `calc(50% - ${height}/2)`,
                    bottom: `calc(50% - ${height}/2)`,
                }}
            >
                <div className='col list' style={{width: listWidth}}>
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
                <div className='col content' style={{width: `calc(100% - ${listWidth})`}}>
                    <Annotation annotation={annotations[selectedIndex]} />
                </div>
                <button
                    type='button'
                    className='btn icon icon-x hide-container'
                    onClick={this.hide}
                />
            </div>
        ]
    }

    renderBackdrop() {
        return (
            Config.get('container.backdrop')
            ? (
                <div
                    key='backdrop'
                    className='backdrop'
                    onClick={this.hide}
                />
            )
            : null
        )
    }

    componentDidMount() {
        this.didUpdate()
    }

    componentDidUpdate() {
        this.didUpdate()
    }

    didUpdate() {
        const {hidden} = this.state
        if (hidden) {
            atom.views.getView(atom.workspace).classList.remove('has-code-annotations-container')
            this.blur()
        }
        else {
            atom.views.getView(atom.workspace).classList.add('has-code-annotations-container')
            this.focus()
        }
    }

    setElement = element => {
        this.element = element
    }

    get editor() {
        return atom.workspace.getActiveTextEditor()
    }

    selectAnnotation = index => {
        this.setState({selectedIndex: index})
    }

    selectPrev = () => {
        const {annotations, selectedIndex: currentIndex} = this.state
        const selectedIndex = (
            currentIndex === 0
            ? annotations.length - 1
            : currentIndex - 1
        )
        this.setState({selectedIndex})
    }

    selectNext = () => {
        const {annotations, selectedIndex: currentIndex} = this.state
        const selectedIndex = (
            currentIndex === annotations.length - 1
            ? 0
            : currentIndex + 1
        )
        this.setState({selectedIndex})
    }

    moveSelectedUp = async () => {
        const {editor} = this
        const {annotations, selectedIndex} = this.state
        if (selectedIndex > 0) {
            const newIndex = selectedIndex - 1
            const db = await AnnotationsDb.getInstance(editor)
            const rearranged = Utils.moveElement(
                annotations,
                selectedIndex,
                newIndex,
            )
            this.setState({
                annotations: rearranged,
                selectedIndex: newIndex,
            })
            db.update(rearranged)
        }
    }

    moveSelectedDown = async () => {
        const {editor} = this
        const {annotations, selectedIndex} = this.state
        if (selectedIndex < annotations.length - 1) {
            const newIndex = selectedIndex + 1
            const db = await AnnotationsDb.getInstance(editor)
            const rearranged = Utils.moveElement(
                annotations,
                selectedIndex,
                newIndex,
            )
            this.setState({
                annotations: rearranged,
                selectedIndex: newIndex,
            })
            db.update(rearranged)
        }
    }

    deleteAnnotation = async index => {
        if (Config.get('dialogs.showDeleteConfirm')) {
            const buttonIndex = await Utils.showMessageBox({
                message: DELETE_CONFIRM_MESSAGE,
                buttons: ['Delete', 'Cancel'],
            })
            if (buttonIndex === 1) {
                return
            }
        }

        const {editor} = this
        const {deleteAnnotation} = this.props
        const {annotations, selectedIndex} = this.state

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

    editAnnotation = async index => {
        const {editor} = this
        const {editAnnotation} = this.props
        const {annotations} = this.state
        const {lineNumber, title, content, type} = annotations[index]
        this.hide()
        try {
            const newContent = await Annotation.askForContent(type, title, {content})
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

    hide = () => {
        this.setState({hidden: true}, () => {
            atom.views.getView(atom.workspace).classList.remove('has-code-annotations-container')
            this.blur()
        })
    }

    focus = () => {
        this.previouslyFocusedElement = document.activeElement
        this.element.focus()
    }

    blur = () => {
        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus()
            this.previouslyFocusedElement = null
        }
    }
}
