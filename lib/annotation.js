'use babel'

import path from 'path'

import Config from './config'
import * as Renderers from './asset-renderers/all-renderers'
import CodeAnnotations from './constants'
import Utils from './utils'


export default class Annotation {

    constructor(codeAnnotationManager, kwargs) {
        const {
            editor,
            marker,
            gutter,
            rawAnnotation,
        } = kwargs

        this.codeAnnotationManager = codeAnnotationManager

        this.editor = editor
        this.marker = marker
        this.marker.setProperties({annotation: this})
        this.rawAnnotation = rawAnnotation

        this.element = null
        this.renderer = null
        this.fallbackRenderer = Renderers[Config.fallbackRenderer] || Renderers.TextRenderer

        this.renderer = this._getRenderer()

        const gutterIcon = this._createGutterIcon()
        gutter.decorateMarker(this.marker, {item: gutterIcon})
        this._addEventListenersToGutterIcon(gutterIcon)
    }

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE
    _createGutterIcon() {
        // TODO: use setting here for custom icon.
        //       see https://flight-manual.atom.io/hacking-atom/sections/iconography/
        return document.createElement('code-annotation-gutter-icon')
    }

    _addEventListenersToGutterIcon(gutterIcon) {
        gutterIcon.addEventListener('click', event => this.show())
        return gutterIcon
    }

    _createWrapper() {
        return document.createElement('code-annotation')
    }

    _getRenderer() {
        const {type} = this.rawAnnotation
        const rendererClasses = (
            this.codeAnnotationManager.loadedRendererClasses
            .filter(rendererClass => rendererClass.type === type)
            .sort((a, b) => a.priority - b.priority)
        )
        const rendererClass = (
            rendererClasses.length > 0
            ? rendererClasses[0]
            : this.fallbackRenderer
        )
        console.log(rendererClass, this.rawAnnotation)
        return new rendererClass(this.rawAnnotation)
    }

    _updateElement() {
        this._resetElement()
        this.show()
    }

    _resetElement() {
        this.element = null
    }

    ///////////////////////////////////////////////////////////////////////////
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
            this.renderer = this._getRenderer(this.assetFile)
            this._updateElement()
        }
    }

    changeType(rendererClass) {
        let assetName = this.assetFile.getBaseName()
        // TODO: use rendererClass.type
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

    // // this method is called when the marker becomes invalid
    // invalidate() {
    //     // this.gutterIcon.addClass('invalid')
    // }
    //
    // // this method is called when the marker becomes valid
    // validate() {
    //     // this.gutterIcon.removeClass('invalid')
    // }
};
