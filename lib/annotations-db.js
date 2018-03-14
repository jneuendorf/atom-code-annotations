'use babel'

import {Directory} from 'atom'
import cson from 'season'
import fs from 'fs-plus'
import path from 'path'

import Constants from './constants'
import * as Utils from './utils'

/*
 * Represents a .annotations.cson file.
 * All changes on an instance of this class are written to that file.
 * Thus they are always in sync (assuming no other source changes the file).
 */
export default class AnnotationsDb {
    static _instances = []

    constructor(projectDir) {
        this.projectDir = projectDir
        this.filePath = path.join(projectDir.getPath(), Constants.ANNOTATIONS_FILENAME)
        this.annotations = cson.readFileSync(this.filePath)

        AnnotationsDb._instances.push(this)
        console.log('created annotationsDb', this)
    }

    static getInstanceForEditor(editor) {
        const editorPath = editor.getPath()
        for (const annotationsDb of this._instances) {
            // console.log('trying db',  annotationsDb, 'for', editorPath)
            if (annotationsDb.getProjectDir().contains(editorPath)) {
                return annotationsDb
            }
        }
        return null
    }

    static getAnnotationsForEditor(editor) {
        const instance = this.getInstanceForEditor(editor)
        if (instance) {
            return instance.getAnnotationsForEditor(editor)
        }
        return []
    }

    // TODO: call this method!
    // Destructor. Invoked when 'atom.project.rootDirectories' changes.
    destroy() {
        AnnotationsDb._instances = AnnotationsDb._instances.filter(
            instance => instance !== this
        )
    }

    // Returns a new array instance containing the annotation objects.
    getAnnotationsForEditor(editor) {
        const editorPath = path.normalize(editor.getPath())
        const projectPath = this.getProjectPath()
        for (const relAnnotatedFilePath in this.annotations) {
            const absAnnotatedFilePath = path.normalize(
                path.join(projectPath, relAnnotatedFilePath)
            )
            if (path.relative(editorPath, absAnnotatedFilePath) === '') {
                return [...this.annotations[relAnnotatedFilePath]]
            }
        }
        return []
    }

    getProjectDir() {
        return this.projectDir
    }

    getProjectPath() {
        return this.getProjectDir().getPath()
    }

    getAnnotationsFilePath() {
        return this.filePath
    }

    has(name) {
        return (this.annotations[name] != null)
    }

    get(name) {
        return this.annotations[name] || null
    }

    add(name, asset) {
        if (this.annotations[name]) {
            throw new Error(`code-annotations: Entry with name '${name}' already exists.`)
        }
        this.annotations[name] = asset
    }

    delete(codeAnnotationName) {
        if (this.annotations[codeAnnotationName]) {
            fs.removeSync(path.join(this.getProjectDir(), this.annotations[codeAnnotationName]))
            delete this.annotations[codeAnnotationName]
            return this
        }
        throw new Error(`code-annotations: There is no entry with name '${codeAnnotationName}'.`)
    }

    updateName(oldName, newName) {
        if (this.has(oldName)) {
            this.annotations[newName] = this.annotations[oldName]
            delete this.annotations[oldName]
        }
        return this
    }

    renameAsset(codeAnnotationName, newAssetName) {
        // const asset = this.get(codeAnnotationName)
        fs.moveSync(path.join(this.getProjectDir(), this.annotations[codeAnnotationName]), path.join(this.getProjectDir(), newAssetName))
        this.annotations[codeAnnotationName] = newAssetName
        return this
    }

    move(codeAnnotationName, targetAssetManager) {
        targetAssetManager.set(codeAnnotationName, path.join(this.getProjectDir(), this.annotations[codeAnnotationName]))
            .save()
        this.delete(codeAnnotationName)
            .save()
        return this
    }

    // set data and copy file
    set(codeAnnotationName, asset) {
        const assetName = `${this._asciiFilename(codeAnnotationName)}${path.extname(asset)}`.toLowerCase()
        this.annotations[codeAnnotationName] = assetName
        // copy asset to local .code-annotations directory
        fs.copyFileSync(asset, path.join(this.getProjectDir(), assetName))
        return this
    }

    createFromName(codeAnnotationName) {
        const assetName = `${this._asciiFilename(codeAnnotationName)}.txt`.toLowerCase()
        this.annotations[codeAnnotationName] = assetName
        // create asset in local .code-annotations directory
        fs.writeFileSync(path.join(this.getProjectDir(), assetName), '')
        return this
    }

    save() {
        cson.writeFileSync(this.filePath, this.annotations)
        return this
    }

    _asciiFilename(string) {
        return Utils.escapeNonAscii(string).slice(0, 20)
    }
};
