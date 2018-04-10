'use babel'

import AnnotationsDb from './annotations-db'
import Config from './config'
import Renderers from './asset-renderers'
import * as Utils from './utils'
import {AbortError} from './errors'


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
            annotations: (this.marker.getProperties().annotations || []).concat([this])
        })
        this.rawAnnotation = rawAnnotation

        this.element = null
        this.renderer = null
        this.fallbackRenderer = Renderers[Config.fallbackRenderer] || Renderers.TextRenderer

        this.renderer = this._getRenderer()
    }

    // @param kwargs {Object} These options are passed to 'createAndOpenTmpFile'.
    static async askForContent(type, title, kwargs) {
        const rendererClass = Renderers.byType[type]
        if (rendererClass.isBinary) {
            const paths = Utils.chooseFile('Now, choose a file!')
            if (!paths || paths.length === 0) {
                throw new AbortError('No file chosen.')
            }
            return Utils.readFileBase64(paths[0])
        }
        else {
            return Utils.createAndOpenTmpFile(
                `${title}.${rendererClass.fileExtension}`,
                kwargs
            )
        }
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
        const {type, title, content} = this.rawAnnotation
        return Annotation.askForContent(type, title, {content})
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
