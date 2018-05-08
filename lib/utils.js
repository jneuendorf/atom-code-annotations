'use babel'

import {dialog} from 'remote'
import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import uniqueId from 'lodash.uniqueid'
import mime from 'mime/lite'

import {AbortError} from './errors'


export function chooseFile(alertMessage) {
    if (alertMessage) {
        alert(alertMessage)
    }
    return dialog.showOpenDialog({properties: ['openFile']})
}

export const readFileBase64 = (filePath, {withMeta=true}={}) => {
    const binaryData = fs.readFileSync(filePath)
    let result = new Buffer(binaryData).toString('base64')
    if (withMeta) {
        const mimeType = mime.getType(path.extname(filePath))
        if (!mimeType) {
            throw new Error('Must not choose a file without an extension!')
        }
        result = `data:${mimeType};base64,${result}`
    }
    return result
}

export const generateTmpPath = function(filename) {
    const uid = uniqueId()
    return path.join(
        os.tmpdir(), 'code-annotations', uid, filename
    )
}

export const createAndOpenTmpFile = (filename, {content='', subscriptions=true}={}) => {
    const tmpfilePath = generateTmpPath(filename)
    if (content) {
        fs.ensureDirSync(path.dirname(tmpfilePath))
        fs.writeFileSync(tmpfilePath, content)
    }
    // Non-existing files can be opened.
    const promise = atom.workspace.open(tmpfilePath)
    if (subscriptions) {
        return promise.then(editor => {
            const editorPath = editor.getPath()
            return new Promise((resolve, reject) => {
                editor.onDidSave(event =>
                    fs.readFile(
                        event.path,
                        {encoding: 'utf8'},
                        (error, data) => {
                            if (error) {
                                reject(error)
                            }
                            else {
                                resolve(data)
                            }
                        }
                    )
                )
                editor.onDidDestroy(() => {
                    fs.unlink(editorPath, error => {
                        if (error) {
                            // TODO: this error can be: 'no such file or directory'
                            //       if nothing was saved before. this should be
                            //       ignored/caught.
                            reject(error)
                        }
                        else {
                            reject(
                                new AbortError('Editor was closed without saving.')
                            )
                        }
                    })
                })
            })
        })
    }
    else {
        return promise
    }
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
