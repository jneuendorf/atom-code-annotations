'use babel'

// import {Directory} from 'atom'
import {$} from 'atom-space-pen-views'
import path from 'path'

import Utils from './utils'
import CodeAnnotations from './constants'

export default class Annotation {
    constructor(codeAnnotationManager, editorData, assetData, fallbackRenderer) {
        let gutter
        this.codeAnnotationManager = codeAnnotationManager;

        ({editor: this.editor, marker: this.marker, gutter} = editorData)
        this.marker.setProperties({annotation: this});

        ({assetManager: this.assetManager, assetDirectory: this.assetDirectory, line: this.line, name: this.name} = assetData)
        this.element = null

        this.assetFile = null
        this.renderer = null
        this.fallbackRenderer = fallbackRenderer || null
        this.gutterIcon = null

        this._init(gutter)
    }

    _init(gutter) {
        this.assetFile = this._getAssetFile()
        this.renderer = this._getRenderer(this.assetFile, this.fallbackRenderer)

        const gutterIcon = this._createGutterIcon()
        gutter.decorateMarker(this.marker, {item: gutterIcon})
        this._addEventListenersToGutterIcon(gutterIcon)
        this.gutterIcon = $(gutterIcon)
    }

    //##########################################################################################
    // PRIVATE
    _createGutterIcon() {
        return document.createElement('code-annotation-gutter-icon')
    }

    _addEventListenersToGutterIcon(gutterIcon) {
        gutterIcon.addEventListener('click', event => {
            return this.show()
        })
        return gutterIcon
    }

    _createWrapper() {
        return document.createElement('code-annotation')
    }

    _getAssetFile() {
        const name = this.assetManager.get(this.name)
        for (let asset of this.assetDirectory.getEntriesSync()) {
            if (asset.getBaseName() === name) {
                return asset
            }
        }
        throw new Error(`Found no asset for name '${this.name}' at '${this.assetDirectory.getPath()}'.`)
    }

    _getRenderer(assetFile, fallbackRenderer) {
        const filename = assetFile.getBaseName()
        let renderer = fallbackRenderer
        let maxPriority = -1
        console.log(this.codeAnnotationManager.rendererClasses)
        for (let rendererClass of this.codeAnnotationManager.rendererClasses) {
            const {result, priority} = rendererClass.supports(filename)
            if ((result === true) && (priority > maxPriority)) {
                renderer = rendererClass
                maxPriority = priority
            }
        }
        if (renderer != null) {
            return new renderer(assetFile)
        }
        throw new Error(`Found no renderer for asset '${filename}' of code annotation '${this.name}'.`)
    }

    _updateElement() {
        this._resetElement()
        this.show()
    }

    _resetElement() {
        this.element = null
    }

    //##########################################################################################
    // PUBLIC

    show() {
        if (!this.element) {
            this.element = this._createWrapper()
            this.element.appendChild(this.renderer.render(this.codeAnnotationManager, true))
        }
        this.codeAnnotationManager.showContainer(this, this.element)
        if (typeof(this.renderer.afterShow) === 'function') {
            this.renderer.afterShow(this.codeAnnotationManager)
        }
    }

    hide() {
        this.codeAnnotationManager.hideContainer()
    }

    getRenderer() {
        return this.renderer
    }

    updateName(newName) {
        const oldName = this.name
        if (oldName !== newName) {
            this.assetManager.updateName(oldName, newName)
                .save()
            this.name = newName
            this.editor.setTextInBufferRange(
                this.marker.getBufferRange(),
                this.line.replace(oldName, newName)
            )
        }
    }

    edit() {
        // load asset contents into a TextEditor
        if (this.renderer.isTextBased()) {
            atom.workspace.open(this.assetFile.getPath()).then(editor => {
                return editor.onDidSave(event =>
                    this._resetElement()
                )
            })
        // choose new file as asset
        }
        else {
            const paths = Utils.chooseFile()
            if (!paths) {
                // atom.notifications.addInfo("No new asset chosen.")
                return
            }

            const newAssetPath = paths[0]
            // remove old file if it's of a new type
            if (path.extname(newAssetPath).toLowerCase() !== path.extname(this.assetFile.getBaseName())) {
                this.assetManager.delete(this.name)
            }

            this.assetManager.set(this.name, newAssetPath)
                .save()

            this.assetFile = this._getAssetFile()
            this.renderer = this._getRenderer(this.assetFile, this.fallbackRenderer)
            this._updateElement()
        }
    }

    changeType(rendererClass) {
        let assetName = this.assetFile.getBaseName()
        assetName = assetName.replace(path.extname(assetName), `.${rendererClass.getFileExtension()}`)
        this.assetManager.renameAsset(this.name, assetName)
            .save()
        this.assetFile = this.assetDirectory.getFile(assetName)
        this.renderer = new rendererClass(this.assetFile)
        this._updateElement()
    }

    // removes the annotation from code and file system
    delete(changeBufferText=true) {
        if (changeBufferText) {
            // strip "CODE-ANNOTATION: " for comment so the name remains for comment semantics
            this.editor.setTextInBufferRange(
                this.marker.getBufferRange(),
                this.line.replace(CodeAnnotations.CODE_KEYWORD, ' ')
            )
        }
        // remove entry from names.cson + remove asset file from file system
        this.assetManager
            .delete(this.name)
            .save()
        this.destroy()
    }

    // destroys the instance
    destroy() {
        if (this.element) {
            this.element.remove()
        }
        // remove gutter marker + decoration (== gutter icon)
        this.marker.destroy()
    }

    // this method is called when the marker becomes invalid
    invalidate() {
        this.gutterIcon.addClass('invalid')
    }

    // this method is called when the marker becomes valid
    validate() {
        this.gutterIcon.removeClass('invalid')
    }
};
