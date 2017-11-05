'use babel'

import {dialog} from 'remote'
import fs from 'fs'
import path from 'path'

export function createElement(tag, classes, callback) {
    if (!classes) classes = ''
    const element = document.createElement(tag)
    element.className = classes
    if (typeof callback === 'function') {
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

export function createFile(filePath, content) {
    if (!content) content = ''
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
        var code = string.charCodeAt(i)
        if (32 <= code && code <= 126) {
            res += char
        } else {
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
