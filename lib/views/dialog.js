'use babel'

// This file is mostly the JavaScript version of:
// https://github.com/atom/tree-view/blob/fff167949c1ea788bf2178430903a45bc039a080/lib/dialog.coffee
import {
    TextEditor,
    CompositeDisposable,
    Disposable,
} from 'atom'

import {ValueError} from '../errors'


export default class Dialog {
    disposables = new CompositeDisposable()
    element = document.createElement('div')
    promptText = document.createElement('label')
    errorMessage = document.createElement('div')
    miniEditor = new TextEditor({mini: true})
    // We need to store the promise's state separately
    // because there is no API for that.
    promiseHasResolved = false


    constructor(options={}) {
        const {
            initialText='',
            select=false,
            iconClass='',
            prompt='',
            attach=false,
            focusAfterClose=null,
            handleConfirm=null,
        } = options

        this.promise = new Promise((resolve, reject) => {
            this.resolvePromise = resolve
        })
        this.focusAfterClose = focusAfterClose
        // Enable customization without subclassing.
        if (handleConfirm) {
            this.handleConfirm = handleConfirm.bind(this)
        }

        this.promptText.classList.add('icon')
        if (iconClass) {
            this.promptText.classList.add(iconClass)
        }
        this.promptText.textContent = prompt

        const blurHandler = () => {
            if (document.hasFocus()) {
                this.close()
            }
        }
        this.miniEditor.element.addEventListener('blur', blurHandler)
        this.miniEditor.setText(initialText)

        this.disposables.add(new Disposable(() =>
            this.miniEditor.element.removeEventListener('blur', blurHandler)
        ))
        this.disposables.add(
            this.miniEditor.onDidChange(() => this.showError())
        )

        this.errorMessage.classList.add('error-message')

        this.element.appendChild(this.promptText)
        this.element.appendChild(this.miniEditor.element)
        this.element.appendChild(this.errorMessage)

        atom.commands.add(this.element, {
            'core:confirm': () => {
                let successfullyConfirmed = false
                let value
                try {
                    value = this.handleConfirm(this.miniEditor.getText())
                    successfullyConfirmed = true
                }
                catch (error) {
                    if (error instanceof ValueError) {
                        atom.notifications.addInfo(error.message)
                    }
                    else {
                        throw error
                    }
                }

                if (successfullyConfirmed) {
                    this.resolvePromise(value)
                    this.promiseHasResolved = true
                    this.close()
                }
            },
            'core:cancel': () => this.cancel(),
        })

        if (attach) {
            this.attach()
        }
        if (select) {
            this.miniEditor.selectAll()
        }
    }

    attach() {
        this.panel = atom.workspace.addModalPanel({item: this})
        this.miniEditor.element.focus()
        this.miniEditor.scrollToCursorPosition()
    }

    close() {
        this.panel && this.panel.destroy()
        this.panel = null
        this.disposables.dispose()
        this.miniEditor.destroy()
        const activePane = atom.workspace.getCenter().getActivePane()
        if (!activePane.isDestroyed()) {
            activePane.activate()
        }
    }

    // This method should be implemented by a subclass.
    // It should return the processed value of the input or throw a ValueError.
    // In case of a ValueError its message should be user friendly since it
    // will be displayed as notification.
    // @param input {String} The entered text of the dialog text field.
    handleConfirm(input) {
        return input
    }

    cancel() {
        this.close()
        if (this.focusAfterClose) {
            this.focusAfterClose.focus()
        }
    }

    showError(message='') {
        this.errorMessage.textContent = message
        if (message) {
            this.element.classList.add('error')
            window.setTimeout(
                () => this.element.classList.remove('error'),
                300
            )
        }
    }

    async awaitConfirm() {
        if (this.promiseHasResolved) {
            throw new Error('This dialog has already been confirmed.')
        }
        return this.promise
    }
}
