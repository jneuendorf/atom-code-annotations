'use babel'

import {$, TextEditorView} from 'atom-space-pen-views'

import CodeAnnotations from '../constants'
import Config from '../config'
import * as Utils from '../utils'


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
                    <div class="name">
                        <h4 class="code-annotation-name" title="double click to edit"></h4>
                    </div>
                    <div class="buttons">
                        <button class="inline-block btn icon icon-trashcan delete">Delete</button>
                        <button class="inline-block btn icon icon-x disappear">Close</button>
                        <button class="inline-block btn icon icon-pencil edit">Edit content</button>
                    </div>
                </div>
            </div>
            <hr class="middle line">
            <div class="bottom block content"></div>
        </div>
        <div style='clear: both;'></div>
    </code-annotation-container>`)

    constructor(codeAnnotationManager) {
        this.codeAnnotationManager = codeAnnotationManager
        this.annotation = null
        this.nameElement = null
        this.content = null
        this.textEditorView = null
        // add class to workspace for keymapping
        this.atomWorkspaceView = $(atom.views.getView(atom.workspace))
        this.atomWorkspaceView.addClass('has-code-annotations-container')

        this.element = this._addEventListeners(this._createElement())
        const pane = atom.views.getView(atom.workspace.getActivePane())
        pane.appendChild(this.getElement())

        this.selectedIndex = 0

        // get layout data for being passed onto asset renderers for optimized rendering
        this.width = this.element.width()
        this.height = this.element.height()
        const hiddenElement = this.element.children('.hidden')
        codeAnnotationManager.textColor = hiddenElement.css('color')
        codeAnnotationManager.backgroundColor = hiddenElement.css('background-color')

        this.textEditorView.hide()
        this.element.hide()
    }

    _addEventListeners(element) {
        // buttons
        element.find('.btn.delete').click(event => {
            if (Config.showDeleteConfirmDialog && !Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
                return this
            }
            this.annotation.delete()
            return this.hide()
        })
        element.find('.btn.edit').click(event => {
            return this.annotation.edit()
        })
        element.find('.btn.disappear').click(event => {
            return this.hide()
        })
        // asset name elements' events
        this.nameElement.dblclick(() => {
            this.toggleMiniTextEditor()
            this.textEditorView.focus()
            return this
        })
        this.textEditorView.keyup(evt => {
            // on escape
            if (evt.which === 27) {
                this.toggleMiniTextEditor()
                return false
            }
            // on enter
            if (evt.which === 13) {
                const newName = this.textEditorView.getText()
                this.annotation.updateName(newName)
                this.nameElement.text(newName)
                this.toggleMiniTextEditor()
            }
            return true
        })
        return element
    }

    _createElement() {
        const element = this.constructor.element.clone()
        this.content = element.find('.content')
        this.nameElement = element.find('.code-annotation-name')
        this.textEditorView = new TextEditorView({
            mini: true,
            placeholder: 'Title',
        })
        element.find('.name').append(this.textEditorView)
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
        if (this.textEditorView.is(':visible')) {
            this.toggleMiniTextEditor()
        }
        this.element.css('display', 'none')
        return this
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
        this.nameElement.text(this.annotations[0].rawAnnotation.title)
        this.textEditorView.getModel().setText(this.annotations[0].rawAnnotation.title)
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

        this.element.find('.select-list.annotations .list-group').empty().append(
            this.annotations
            .map((annotation, index) => {
                const {rawAnnotation} = annotation
                const icon = (
                    rawAnnotation.type in icons
                    ? `icon-${icons[rawAnnotation.type]}`
                    : ''
                )
                return `<li class='two-lines ${index === this.selectedIndex ? 'selected' : ''}' data-index='${index}'>
                    <div class='status icon icon-x'></div>
                    <div class='status icon icon-pencil'></div>
                    <div class='primary-line icon ${icon}'>${rawAnnotation.title}</div>
                    <div class='secondary-line no-icon'>${rawAnnotation.type}</div>
                </li>`
            })
            .join('')
        ).find('li').click(event => {
            const li = $(event.currentTarget)
            const siblings = li.siblings('li')
            const index = parseInt(li.attr('data-index'), 10)

            siblings.filter('.selected').removeClass('selected')
            li.addClass('selected')

            this.selectedIndex = index
            this.update()
        })

        const container = document.createElement('div')
        container.appendChild(this.annotations[this.selectedIndex].render())
        this.setContent(container)
    }

    // for editing the asset name
    toggleMiniTextEditor() {
        this.nameElement.toggle()
        this.textEditorView.toggle()
        return this
    }
}
