'use babel'

import {dialog} from 'remote'
import os from 'os'
import fs from 'fs-extra'
import path from 'path'
// import {Directory} from 'atom'
import uniqueId from 'lodash.uniqueid'
import mime from 'mime/lite'

import {AbortError} from './errors'


export function createElement(tag, classes='', callback) {
    const element = document.createElement(tag)
    element.className = classes
    if (typeof(callback) === 'function') {
        callback(element)
    }
    return element
}

export function chooseFile(alertMessage) {
    if (alertMessage) {
        alert(alertMessage)
    }
    return dialog.showOpenDialog({properties: ['openFile']})
}

export function copyFile(source, destination) {
    let buffer
    try {
        buffer = fs.readFileSync(source)
    } catch (error) {
        throw new Error(`Could not read '${source}'.`)
    }
    fs.writeFileSync(destination, buffer)
}

export function createDirectory(dirPath) {
    fs.mkdirSync(dirPath)
}

export function createFile(filePath, content='') {
    if (filePath instanceof Array) {
        filePath = path.join.apply(path, filePath)
    }
    fs.writeFileSync(filePath, content)
}

export function escapeNonAscii(string) {
    // asciiChars = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"
    // char code range: [32, 126]
    let res = ''
    for (let i = 0; i < string.length; i++) {
        const char = string[i]
        const code = string.charCodeAt(i)
        if (32 <= code && code <= 126) {
            res += char
        }
        else {
            res += '_'
        }
    }
    return res
}

export function confirm(options) {
    const buttons = ['OK', 'Cancel']
    options.buttons = buttons
    return buttons[atom.confirm(options)] === 'OK'
}

export function getGutterWithName(editor, gutterName) {
    for (let gutter of editor.getGutters()) {
        if (gutter.name === gutterName) {
            return gutter
        }
    }
    return null
}

export function camelToKebab(str) {
    return str[0].toLowerCase() + str.slice(1).replace(/([A-Z])/g, upperCaseChar => `-${upperCaseChar.toLowerCase()}`)
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
