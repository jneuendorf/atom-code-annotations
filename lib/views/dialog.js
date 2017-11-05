'use babel'

// NOTE: adapted from tree-view package
import {TextEditorView, View} from 'atom-space-pen-views'

export default class Dialog extends View {
    static content(param) {
        if (!param) { param = {} }
        const {prompt} = param
        return this.div({class: 'code-annotations-dialog'}, () => {
            this.label(prompt, {class: 'icon', outlet: 'promptText'})
            return this.subview('miniEditor', new TextEditorView({mini: true}))
        })
    }

    // this method gets called right after the constructor with the constructor's arguments (applied)
    // initialize: ({initialPath = "", select = false, iconClass} = {}) ->
    initialize(param) {
        if (!param) { param = {} }
        const {iconClass} = param
        this.miniEditorModel = this.miniEditor.getModel()
        if (iconClass) {
            this.promptText.addClass(iconClass)
        }
        atom.commands.add(this.element, {
            'core:confirm': () => {
                return this._submit(this.miniEditor.getText())
            },
            'core:cancel': () => {
                return this.close()
            }
        })
        if (document.hasFocus()) {
            this.miniEditor.on('blur', () => {
                return this.close()
            })
        }
    }

    attach() {
        this.panel = atom.workspace.addModalPanel({item: this.element})
        this.miniEditorModel.scrollToCursorPosition()
        this.miniEditor.focus()
    }

    close() {
        const panelToDestroy = this.panel
        this.panel = null
        if (panelToDestroy) {
            panelToDestroy.destroy()
        }
        atom.workspace.getActivePane().activate()
    }

    _submit() {
        throw new Error('Must be implemented by subclass!')
    }

    onSubmit(callback) {
        this.onSubmitCallback = callback
    }
}
