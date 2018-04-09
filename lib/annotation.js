'use babel'

import path from 'path'

import AnnotationsDb from './annotations-db'
import Config from './config'
import Renderers from './asset-renderers'
import * as Utils from './utils'


export default class Annotation {

    constructor(codeAnnotationManager, kwargs) {
        const {
            editor,
            marker,
            rawAnnotation,
        } = kwargs

        this.codeAnnotationManager = codeAnnotationManager

        this.editor = editor
        this.marker = marker
        this.marker.setProperties({
            annotations: (this.marker.annotations || []).concat([this])
        })
        this.rawAnnotation = rawAnnotation

        this.element = null
        this.renderer = null
        this.fallbackRenderer = Renderers[Config.fallbackRenderer] || Renderers.TextRenderer

        this.renderer = this._getRenderer()
    }

    static equal(annotations, {raw=true, regardLineNumber=true}={}) {
        if (!raw) {
            annotations = annotations.map(annotation => annotation.rawAnnotation)
        }
        const [first, ...rest] = annotations
        return rest.reduce(
            (acc, annotation) => acc && this._rawAnnotationsEqual(first, annotation),
            true
        )
    }

    static _rawAnnotationsEqual(a, b, regardLineNumber) {
        return (
            a.title === b.title
            && a.content === b.content
            && a.type === b.type
            && (
                regardLineNumber
                ? a.lineNumber === b.lineNumber
                : true
            )
        )
    }

    ///////////////////////////////////////////////////////////////////////////
    // PRIVATE

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
        console.log('annotation:', this, 'possible renderers:', rendererClasses)
        const rendererClass = (
            rendererClasses.length > 0
            ? rendererClasses[0]
            : this.fallbackRenderer
        )
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
            this.render()
        }
        this.codeAnnotationManager.showContainer(this, this.element)
        if (typeof(this.renderer.afterShow) === 'function') {
            this.renderer.afterShow(this.codeAnnotationManager)
        }
    }

    hide() {
        this.codeAnnotationManager.hideContainer()
    }

    render() {
        this.element = this._createWrapper()
        this.element.appendChild(this.renderer.render(this.codeAnnotationManager))
        return this.element
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

    async edit() {
        // load asset contents into a TextEditor
        if (!this.renderer.isBinary()) {
            const {title, content} = this.rawAnnotation
            return Utils.createAndOpenTmpFile(
                `${title}.${this.renderer.constructor.fileExtension}`,
                {content}
            )
        }
        // choose new file as asset
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

    delete() {
        AnnotationsDb.delete(this.editor, [this.rawAnnotation])
        this.destroy()
    }

    // destroys the instance
    destroy() {
        if (this.element) {
            this.element.remove()
        }
        const {annotations} = this.marker.getProperties()
        if (annotations.length <= 1) {
            // remove gutter marker + decoration (== gutter icon)
            this.marker.destroy()
        }
    }
}
