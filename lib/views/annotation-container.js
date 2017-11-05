'use babel'

import {$, TextEditorView} from 'atom-space-pen-views'

import CodeAnnotations from '../constants'
import Config from '../config'
import * as Utils from '../utils'
import ChangeTypeView from './change-type-view'


export default class CodeAnnotationContainer {
    static element = $(`<code-annotation-container>
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
            <button class="inline-block btn icon icon-paintcan change-type">Change type</button>
        </div>
        </div>
        </div>
        <hr class="middle line">
        <div class="bottom block content">
        </div>
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
        element.find('.btn.change-type').click(event => {
            return this.changeTypeView.show(this.codeAnnotationManager.rendererClasses)
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
        this.textEditorView = new TextEditorView({mini: true})
        element.find('.name').append(this.textEditorView)
        this.changeTypeView = new ChangeTypeView()
        this.changeTypeView.codeAnnotationContainer = this
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

    setCodeAnnotation(annotation) {
        this.annotation = annotation
        return this
    }

    setContent(content) {
        this.content.children().detach()
        this.content.append(content)
        this.nameElement.text(this.annotation.name)
        this.textEditorView.getModel().setText(this.annotation.name)
        return this
    }

    // for editing the asset name
    toggleMiniTextEditor() {
        this.nameElement.toggle()
        this.textEditorView.toggle()
        return this
    }

    changeAnnotationType(rendererClass) {
        this.annotation.changeType(rendererClass)
        return this
    }
}

// module.exports = (CodeAnnotationContainer = (function() {
//     CodeAnnotationContainer = class CodeAnnotationContainer {
//         static initClass() {
//
//             // DEFINE MARKUP
//             this.element = (() =>
//                 $(`<code-annotation-container>
//     <div class="hidden"></div>
//     <div class="top block">
//         <div class="row">
//             <div class="name">
//                 <h4 class="code-annotation-name" title="double click to edit"></h4>
//             </div>
//             <div class="buttons">
//                 <button class="inline-block btn icon icon-trashcan delete">Delete</button>
//                 <button class="inline-block btn icon icon-x disappear">Close</button>
//                 <button class="inline-block btn icon icon-pencil edit">Edit content</button>
//                 <button class="inline-block btn icon icon-paintcan change-type">Change type</button>
//             </div>
//         </div>
//     </div>
//     <hr class="middle line">
//     <div class="bottom block content">
//     </div>
// </code-annotation-container>`
//                 )
//             )()
//         }
//
//
//         // CONSTRUCTOR
//         constructor(codeAnnotationManager) {
//             this.codeAnnotationManager = codeAnnotationManager;
//             this.annotation = null;
//             this.nameElement = null;
//             this.content = null;
//             this.textEditorView = null;
//             // add class to workspace for keymapping
//             this.atomWorkspaceView = $(atom.views.getView(atom.workspace));
//             this.atomWorkspaceView.addClass("has-code-annotations-container");
//
//             this.element = this._addEventListeners(this._createElement());
//             const pane = atom.views.getView(atom.workspace.getActivePane());
//             pane.appendChild(this.getElement());
//
//             // get layout data for being passed onto asset renderers for optimized rendering
//             this.width = this.element.width();
//             this.height = this.element.height();
//             const hiddenElement = this.element.children(".hidden");
//             codeAnnotationManager.textColor = hiddenElement.css("color");
//             codeAnnotationManager.backgroundColor = hiddenElement.css("background-color");
//
//             this.textEditorView.hide();
//             this.element.hide();
//         }
//
//         _addEventListeners(element) {
//             // buttons
//             element.find(".btn.delete").click(event => {
//                 if (Config.showDeleteConfirmDialog && !Utils.confirm({message: CodeAnnotations.DELETE_CONFIRM_MESSAGE})) {
//                     return this;
//                 }
//                 this.annotation.delete();
//                 return this.hide();
//             });
//             element.find(".btn.edit").click(event => {
//                 return this.annotation.edit();
//             });
//             element.find(".btn.disappear").click(event => {
//                 return this.hide();
//             });
//             element.find(".btn.change-type").click(event => {
//                 return this.changeTypeView.show(this.codeAnnotationManager.rendererClasses);
//             });
//             // asset name elements' events
//             this.nameElement.dblclick(() => {
//                 this.toggleMiniTextEditor();
//                 this.textEditorView.focus();
//                 return this;
//             });
//             this.textEditorView.keyup(evt => {
//                 // on escape
//                 if (evt.which === 27) {
//                     this.toggleMiniTextEditor();
//                     return false;
//                 }
//                 // on enter
//                 if (evt.which === 13) {
//                     const newName = this.textEditorView.getText();
//                     this.annotation.updateName(newName);
//                     this.nameElement.text(newName);
//                     this.toggleMiniTextEditor();
//                 }
//                 return true;
//             });
//             return element;
//         }
//
//         _createElement() {
//             const element = this.constructor.element.clone();
//             this.content = element.find(".content");
//             this.nameElement = element.find(".code-annotation-name");
//             this.textEditorView = new TextEditorView({mini: true});
//             element.find(".name").append(this.textEditorView);
//             this.changeTypeView = new ChangeTypeView();
//             this.changeTypeView.codeAnnotationContainer = this;
//             return element;
//         }
//
//         getElement() {
//             return this.element[0];
//         }
//
//         destroy() {
//             this.atomWorkspaceView.removeClass("has-code-annotations-container");
//             this.element.remove();
//             return this;
//         }
//
//         show() {
//             this.element.css("display", "block");
//             this.width = this.element.width();
//             this.height = this.element.height();
//             return this;
//         }
//
//         hide() {
//             if (this.textEditorView.is(":visible")) {
//                 this.toggleMiniTextEditor();
//             }
//             this.element.css("display", "none");
//             return this;
//         }
//
//         empty() {
//             this.content.empty();
//             return this;
//         }
//
//         append(element) {
//             this.content.append(element);
//             return this;
//         }
//
//         setCodeAnnotation(annotation) {
//             this.annotation = annotation;
//             return this;
//         }
//
//         setContent(content) {
//             this.content.children().detach();
//             this.content.append(content);
//             this.nameElement.text(this.annotation.name);
//             this.textEditorView.getModel().setText(this.annotation.name);
//             return this;
//         }
//
//         // for editing the asset name
//         toggleMiniTextEditor() {
//             this.nameElement.toggle();
//             this.textEditorView.toggle();
//             return this;
//         }
//
//         changeAnnotationType(rendererClass) {
//             this.annotation.changeType(rendererClass);
//             return this;
//         }
//     };
//     CodeAnnotationContainer.initClass();
//     return CodeAnnotationContainer;
// })());
