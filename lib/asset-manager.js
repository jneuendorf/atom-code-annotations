'use babel'

import CSON from 'season'
import fs from 'fs-plus'
import path from 'path'

import CodeAnnotations from './constants'
import * as Utils from './utils'

/*
 * This class represents the assets belonging to a project folder.
 * That means the contents of the .names.cson file as well as the asset files themselves.
 * @class AssetManager
 */
export default class AssetManager {
    constructor(path) {
        this.dir = path
        this.file = `${path}/${CodeAnnotations.ASSET_NAMES_FILE}`
        this.data = CSON.readFileSync(this.file)
    }

    getAssetDirectoryPath() {
        return this.dir
    }

    getNamesFilePath() {
        return this.file
    }

    has(name) {
        return (this.data[name] != null)
    }

    get(name) {
        return this.data[name] || null
    }

    add(name, asset) {
        if (!this.data[name]) {
            this.data[name] = asset
            return this
        }
        throw new Error(`code-annotations: Entry with name '${name}' already exists.`)
    }

    delete(codeAnnotationName) {
        if (this.data[codeAnnotationName]) {
            fs.removeSync(path.join(this.dir, this.data[codeAnnotationName]))
            delete this.data[codeAnnotationName]
            return this
        }
        throw new Error(`code-annotations: There is no entry with name '${codeAnnotationName}'.`)
    }

    updateName(oldName, newName) {
        if (this.has(oldName)) {
            this.data[newName] = this.data[oldName]
            delete this.data[oldName]
        }
        return this
    }

    renameAsset(codeAnnotationName, newAssetName) {
        const asset = this.get(codeAnnotationName)
        fs.moveSync(path.join(this.dir, this.data[codeAnnotationName]), path.join(this.dir, newAssetName))
        this.data[codeAnnotationName] = newAssetName
        return this
    }

    // returns if an annotation was replace
    move(codeAnnotationName, targetAssetManager) {
        targetAssetManager.set(codeAnnotationName, path.join(this.dir, this.data[codeAnnotationName]))
            .save()
        this.delete(codeAnnotationName)
            .save()
        return this
    }

    // set data and copy file
    set(codeAnnotationName, asset) {
        const assetName = `${this._asciiFilename(codeAnnotationName)}${path.extname(asset)}`.toLowerCase()
        this.data[codeAnnotationName] = assetName
        // copy asset to local .code-annotations directory
        fs.copyFileSync(asset, path.join(this.dir, assetName))
        return this
    }

    createFromName(codeAnnotationName) {
        const assetName = `${this._asciiFilename(codeAnnotationName)}.txt`.toLowerCase()
        this.data[codeAnnotationName] = assetName
        // create asset in local .code-annotations directory
        fs.writeFileSync(path.join(this.dir, assetName), '')
        return this
    }

    save() {
        CSON.writeFileSync(this.file, this.data)
        return this
    }

    _asciiFilename(string) {
        return Utils.escapeNonAscii(string).slice(0, 20)
    }
};
