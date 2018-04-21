'use babel'

import React from 'react'
import PropTypes from 'prop-types'

import AnnotationList from './annotation-list'
import Annotation from './annotation'
import AnnotationsDb from '../annotations-db'
import CodeAnnotations from '../constants'
import Config from '../config'
import * as Utils from '../utils'
import {AbortError} from '../errors'


export default class CodeAnnotationContainer extends React.PureComponent {
    static propTypes = {
        annotations: PropTypes.array.isRequired,
    }

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
        this.parent = atom.views.getView(atom.workspace)

        // this.selectAnnotation = this.selectAnnotation.bind(this)
        // this.editAnnotation = this.editAnnotation.bind(this)
        // this.deleteAnnotation = this.deleteAnnotation.bind(this)
    }

    // constructor(codeAnnotationManager) {
    //     // this.codeAnnotationManager = codeAnnotationManager
    //     // // TODO: add class only if container is visible?
    //     // // add class to workspace for keymapping
    //     // this.atomWorkspaceView = $(atom.views.getView(atom.workspace))
    //     // this.atomWorkspaceView.addClass('has-code-annotations-container')
    //
    //     // this.element = this._addEventListeners(this._createElement())
    //     // const pane = atom.views.getView(atom.workspace.getActivePane())
    //     // pane.appendChild(this.getElement())
    //
    //     // TODO: Use workspace.addModalPanel and set custom styles:
    //     //       width: x; margin-left: -x/2
    //
    //     // const hiddenElement = this.element.children('.hidden')
    //     // codeAnnotationManager.textColor = hiddenElement.css('color')
    //     // codeAnnotationManager.backgroundColor = hiddenElement.css('background-color')
    // }

    // componentDidCatch(error, info) {
    //     console.log(error, info)
    // }

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
                        editAnnotation={this.editAnnotation.bind(this)}
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

    componentDidMount() {
        this.parent.classList.add('has-code-annotations-container')
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        // get layout data for being passed onto asset renderers for optimized rendering
        const {width, height} = this.element.getBoundingClientRect()
        this.width = width
        this.height = height
    }

    componentWillUnmount() {
        this.parent.classList.remove('has-code-annotations-container')
    }

    setElement = element => {
        this.element = element
    }

    selectAnnotation = index => {
        this.setState({selectedIndex: index})
    }

    deleteAnnotation = index => {
        if (Config.showDeleteConfirmDialog && !Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
            return
        }

        let {selectedIndex} = this.state
        this.annotations[index].delete()
        this.annotations.splice(index, 1)

        if (selectedIndex > 0) {
            // Previously selected annotation stays selected.
            if (index < selectedIndex) {
                selectedIndex--
            }
            // Last annotation was deleted.
            else if (index === selectedIndex && index === this.annotations.length) {
                selectedIndex--
            }
        }
        if (this.annotations.length > 0) {
            this.selectAnnotation(selectedIndex)
        }
        else {
            this.hide()
        }
    }

    async editAnnotation(index) {
        // Must get the editor before editing because for editing non-binary
        // annotations a new editor is opened with tempfile path which we
        // don't want here.
        const editor = atom.workspace.getActiveTextEditor()
        try {
            const newContent = await this.annotations[index].edit()
            console.log(newContent)
            const {lineNumber} = this.annotations[0].rawAnnotation
            // There must be a DB instance because we currently show annotations
            // for the active text editor.
            const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
            annotationsDb.updateAt(lineNumber, index, {content: newContent})
            // TODO: This code is copy-pasted from annotations-manager::addAnnotation
            //       Make it a method => DRY.
            if (this.codeAnnotationManager.initializedEditors.has(editor)) {
                this.codeAnnotationManager._reinitializeEditor(editor)
            }
            else {
                this.codeAnnotationManager._initEditor(editor)
            }
            this.update(this.codeAnnotationManager.initializedEditors.get(editor).annotations)
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

    getElement() {
        return this.element[0]
    }

    destroy() {
        this.atomWorkspaceView.removeClass('has-code-annotations-container')
        this.element.remove()
    }

    empty() {
        this.content.empty()
    }

    append(element) {
        this.content.append(element)
    }

    setContent(content) {
        // this.content.children().detach()
        this.content.empty().append(content)
    }

    update(annotations=null) {
        if (annotations) {
            this.annotations = annotations
            this.selectedIndex = 0
        }
        console.log('updating container with', annotations)

        const icons = {
            text: 'file-text',
            image: 'file-media',
            html: 'file-code',
            frame: 'browser',
            link: 'link',
        }

        const listItemsElem = this.element.find('.select-list.annotations .list-group')
        listItemsElem.empty().append(
            this.annotations
            .map((annotation, index) => {
                const {rawAnnotation} = annotation
                const icon = (
                    rawAnnotation.type in icons
                    ? `icon-${icons[rawAnnotation.type]}`
                    : ''
                )
                return `<li class='two-lines ${index === this.selectedIndex ? 'selected' : ''}' data-index='${index}'>
                    <div class='status icon icon-trashcan'></div>
                    <div class='status icon icon-pencil'></div>
                    <div class='primary-line icon ${icon}'>${rawAnnotation.title}</div>
                    <div class='secondary-line no-icon'>${rawAnnotation.type}</div>
                </li>`
            })
            .join('')
        )
        listItemsElem.find('li').click(event => {
            const li = $(event.currentTarget)
            const siblings = li.siblings('li')
            const index = parseInt(li.attr('data-index'), 10)

            siblings.filter('.selected').removeClass('selected')
            li.addClass('selected')

            this.selectedIndex = index
            this.update()
        })
        listItemsElem.find('.icon-trashcan').click(event => {
            if (Config.showDeleteConfirmDialog && !Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
                return false
            }
            const li = $(event.currentTarget).parent()
            const index = li.parent().children().index(li)
            this.annotations[index].delete()
            this.annotations.splice(index, 1)
            if (this.selectedIndex > 0) {
                // Previously selected annotation stays selected.
                if (index < this.selectedIndex) {
                    this.selectedIndex--
                }
                // Last annotation was deleted.
                else if (index === this.selectedIndex && index === this.annotations.length) {
                    this.selectedIndex--
                }
            }
            if (this.annotations.length > 0) {
                this.update()
            }
            else {
                this.hide()
            }
            return false
        })
        listItemsElem.find('.icon-pencil').click(async event => {
            event.preventDefault()
            event.stopPropagation()

            const li = $(event.currentTarget).parent()
            const index = li.parent().children().index(li)
            // Must get the editor before editing because for editing non-binary
            // annotations a new editor is opened with tempfile path which we
            // don't want here.
            const editor = atom.workspace.getActiveTextEditor()
            try {
                const newContent = await this.annotations[index].edit()
                console.log(newContent)
                const {lineNumber} = this.annotations[0].rawAnnotation
                // There must be a DB instance because we currently show annotations
                // for the active text editor.
                const annotationsDb = AnnotationsDb.getInstanceForEditor(editor)
                annotationsDb.updateAt(lineNumber, index, {content: newContent})
                // TODO: This code is copy-pasted from annotations-manager::addAnnotation
                //       Make it a method => DRY.
                if (this.codeAnnotationManager.initializedEditors.has(editor)) {
                    this.codeAnnotationManager._reinitializeEditor(editor)
                }
                else {
                    this.codeAnnotationManager._initEditor(editor)
                }
                this.update(this.codeAnnotationManager.initializedEditors.get(editor).annotations)
            }
            catch (error) {
                if (error instanceof AbortError) {
                    atom.notifications.addInfo('Changes discarded.')
                }
                else {
                    throw error
                }
            }
        })

        const container = document.createElement('div')
        container.appendChild(this.annotations[this.selectedIndex].render())
        this.setContent(container)
    }
}
