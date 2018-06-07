'use babel'

import {dialog} from 'remote'
import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import uniqueId from 'lodash.uniqueid'
import mime from 'mime/lite'

import {AbortError} from './errors'


export const chooseFile = alertMessage => {
    if (alertMessage) {
        alert(alertMessage)
    }
    return dialog.showOpenDialog({properties: ['openFile']})
}

export const showMessageBox = options => {
    return new Promise((resolve, reject) => {
        try {
            atom.confirm(options, response => resolve(response))
        }
        catch (error) {
            reject(error)
        }
    })
}

export const readFileBase64 = async (filePath, {withMeta=true}={}) => {
    const fileContents = await fs.readFile(filePath, 'base64')
    if (withMeta) {
        const mimeType = mime.getType(path.extname(filePath))
        if (!mimeType) {
            throw new Error('Must not choose a file without an extension!')
        }
        return `data:${mimeType};base64,${fileContents}`
    }
    else {
        return fileContents
    }
}

export const generateTmpPath = filename => {
    const uid = uniqueId()
    return path.join(
        os.tmpdir(), 'code-annotations', uid, filename
    )
}

export const createTmpFile = async (filename, content) => {
    const tmpfilePath = generateTmpPath(filename)
    await fs.ensureDir(path.dirname(tmpfilePath))
    await fs.writeFile(tmpfilePath, content)
    return tmpfilePath
}

// 'kwargs' are passed to 'createTmpFile'.
export const createAndOpenTmpFile = async (filename, {content=''}={}) => {
    let tmpfilePath
    if (content) {
        tmpfilePath = createTmpFile(filename, content)
    }
    else {
        tmpfilePath = generateTmpPath(filename)
    }
    // Non-existing files can be opened.
    const editor = await atom.workspace.open(tmpfilePath)
    // const editorPath = editor.getPath()
    return new Promise((resolve, reject) => {
        editor.onDidSave(async event => {
            try {
                const data = await fs.readFile(event.path, {encoding: 'utf8'})
                resolve(data)
            }
            catch (error) {
                reject(error)
            }
        })
        editor.onDidDestroy(async () => {
            // 'reject' is called in either case but only if the editor has not
            // been saved before. After save the promise is already in the
            // fulfilled state.
            try {
                await fs.unlink(editor.getPath())
                reject(
                    new AbortError('Editor was closed without saving.')
                )
            }
            catch (error) {
                // The error 'no such file or directory' occurs if nothing was
                // saved before. As of https://git.io/vp9Eq we should be able
                // to rely on the error's message.
                if (error.message.startsWith('ENOENT: no such file or directory, unlink')) {
                    reject(new AbortError('Editor was closed without saving.'))
                }
                else {
                    reject(error)
                }
            }
        })
    })
}

export const partition = (array, predicate) => {
    const result = [[], []]
    for (const item of array) {
        result[predicate(item) ? 0 : 1].push(item)
    }
    return result
}

export const dict = tuples => {
    return Object.assign(...tuples.map(tuple => {
        return {[tuple[0]]: tuple[1]}
    }))
}

export const moveElement = (array, fromIndex, toIndex) => {
    const result = array.filter((elem, index) => index !== fromIndex)
    result.splice(toIndex, 0, array[fromIndex])
    return result
}

// Taken from 'asyncbox'. See https://git.io/vp9E3
export const filterAsync = async (iterable, filter, {runInParallel=true}={}) => {
    const result = []
    if (runInParallel) {
        const bools = await Promise.all(iterable.map(filter))
        for (let i = 0; i < iterable.length; i++) {
            if (bools[i]) {
                result.push(iterable[i])
            }
        }
    }
    else {
        for (const item of iterable) {
            if (await filter(item)) {
                result.push(item)
            }
        }
    }
   return result
}
