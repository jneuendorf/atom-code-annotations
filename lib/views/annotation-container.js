'use babel'

import {TextEditor} from 'atom'
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
        annotations: PropTypes.array.isRequired,
        editor: PropTypes.instanceOf(TextEditor).isRequired,
        hidden: PropTypes.bool,
        selectedIndex: PropTypes.number,
        deleteAnnotation: PropTypes.func.isRequired,
        editAnnotation: PropTypes.func.isRequired,
    }

    static defaultProps = {
        hidden: true,
        annotations: [],
    }

    state = {
        hidden: true,
        selectedIndex: 0,
        annotations: [],
    }
    previouslyFocusedElement = null

    constructor(props) {
        super(props)
        // Must be bound explicitly because async mymethod = () => {} does not work...
        // See https://babeljs.io/docs/plugins/transform-class-properties/
        this.editAnnotation = this.editAnnotation.bind(this)
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        const updateState = {}
        if (nextProps.annotations !== prevState.annotations) {
            Object.assign(updateState, {annotations: nextProps.annotations})
        }
        if (nextProps.hidden !== prevState.hidden) {
            Object.assign(updateState, {hidden: nextProps.hidden})
        }
        if (typeof(nextProps.selectedIndex) === 'number'
            && nextProps.selectedIndex !== prevState.selectedIndex
        ) {
            Object.assign(updateState, {selectedIndex: nextProps.selectedIndex})
        }
        if (nextProps.annotations.length === 0) {
            updateState.hidden = true
        }
        return Object.keys(updateState).length > 0 ? updateState : null
    }

    render() {
        const {annotations, hidden, selectedIndex} = this.state
        if (hidden) {
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
                <div className='col' style={{width: listWidth}}>
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
                <div className='col' style={{width: `calc(100% - ${listWidth})`}}>
                    <button
                        type='button'
                        className='btn icon icon-x hide-container'
                        onClick={this.hide}
                    />
                    <Annotation annotation={annotations[selectedIndex]} />
                </div>
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

    selectAnnotation = index => {
        this.setState({selectedIndex: index})
    }

    selectPrev = () => {
        const {annotations} = this.props
        const {selectedIndex: currentIndex} = this.state
        const selectedIndex = (
            currentIndex === 0
            ? annotations.length - 1
            : currentIndex - 1
        )
        this.setState({selectedIndex})
    }

    selectNext = () => {
        const {annotations} = this.props
        const {selectedIndex: currentIndex} = this.state
        const selectedIndex = (
            currentIndex === annotations.length - 1
            ? 0
            : currentIndex + 1
        )
        this.setState({selectedIndex})
    }

    moveSelectedUp = () => {
        const {editor} = this.props
        const {annotations, selectedIndex} = this.state
        if (selectedIndex > 0) {
            const newIndex = selectedIndex - 1
            const db = AnnotationsDb.getInstanceForEditor(editor)
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

    moveSelectedDown = () => {
        const {editor} = this.props
        const {annotations, selectedIndex} = this.state
        if (selectedIndex < annotations.length - 1) {
            const newIndex = selectedIndex + 1
            const db = AnnotationsDb.getInstanceForEditor(editor)
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

    deleteAnnotation = index => {
        if (Config.get('dialogs.showDeleteConfirm')) {
            const cancelDelete = atom.confirm({
                message: DELETE_CONFIRM_MESSAGE,
                buttons: {
                    Delete: () => false,
                    Cancel: () => true,
                },
            })
            if (cancelDelete) {
                return
            }
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
