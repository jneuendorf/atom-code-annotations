'use babel'

import {$} from 'atom-space-pen-views'

import AnnotationsDb from '../annotations-db'
import CodeAnnotations from '../constants'
import Config from '../config'
import * as Utils from '../utils'
import {AbortError} from '../errors'


export default class CodeAnnotationContainer {
    static element = $(`<code-annotation-container>
        <div style='width: 250px; float: left; padding: 5px 10px 5px 5px;'>
            <div class='select-list annotations'>
                <ol class='list-group'></ol>
            </div>
        </div>
        <div style='width: calc(100% - 250px); float: left; padding: 5px 5px 5px 10px;'>
            <div class="hidden"></div>
            <div class="top block">
                <div class="row">
                    <div class="buttons">
                        <button class="inline-block btn icon icon-x disappear">Close</button>
                    </div>
                </div>
            </div>
            <div class="bottom block content"></div>
        </div>
        <div style='clear: both;'></div>
    </code-annotation-container>`)

    constructor(codeAnnotationManager) {
        this.codeAnnotationManager = codeAnnotationManager
        this.annotation = null
        // this.nameElement = null
        this.content = null
        // this.textEditorView = null
        // TODO: add class only if container is visible?
        // add class to workspace for keymapping
        this.atomWorkspaceView = $(atom.views.getView(atom.workspace))
        this.atomWorkspaceView.addClass('has-code-annotations-container')

        this.element = this._addEventListeners(this._createElement())
        const pane = atom.views.getView(atom.workspace.getActivePane())
        pane.appendChild(this.getElement())

        // TODO: Use workspace.addModalPanel and set custom styles:
        //       width: x; margin-left: -x/2

        this.selectedIndex = 0

        // get layout data for being passed onto asset renderers for optimized rendering
        this.width = this.element.width()
        this.height = this.element.height()
        const hiddenElement = this.element.children('.hidden')
        codeAnnotationManager.textColor = hiddenElement.css('color')
        codeAnnotationManager.backgroundColor = hiddenElement.css('background-color')

        this.element.hide()
    }

    _addEventListeners(element) {
        element.find('.btn.edit').click(event => {
            return this.annotation.edit()
        })
        element.find('.btn.disappear').click(event => {
            return this.hide()
        })
        return element
    }

    _createElement() {
        const element = this.constructor.element.clone()
        this.content = element.find('.content')
        return element
    }

    getElement() {
        return this.element[0]
    }

    destroy() {
        this.atomWorkspaceView.removeClass('has-code-annotations-container')
        this.element.remove()
        return this
    }

    show() {
        this.element.css('display', 'block')
        this.width = this.element.width()
        this.height = this.element.height()
        return this
    }

    hide() {
        this.element.css('display', 'none')
    }

    empty() {
        this.content.empty()
        return this
    }

    append(element) {
        this.content.append(element)
        return this
    }

    setContent(content) {
        this.content.children().detach()
        this.content.append(content)
        return this
    }

    update(annotations=null) {
        if (annotations) {
            this.annotations = annotations
        }

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
                annotationsDb.updateAt(editor, lineNumber, index, {content: newContent})
                // TODO: This code is copy-pasted from annotations-manager::addAnnotation
                //       Make it a method => DRY.
                if (this.codeAnnotationManager.initializedEditors.has(editor)) {
                    this.codeAnnotationManager._reinitializeEditor(editor)
                }
                else {
                    this.codeAnnotationManager._initEditor(editor)
                }
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
