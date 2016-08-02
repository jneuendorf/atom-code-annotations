remote = require "remote"
dialog = remote.dialog
# fs = require "fs-plus"
fs = require "fs"

module.exports = class Utils

    @fileHasType: (filename, fileExtension) ->
        if typeof fileExtension is "string"
            # TODO
            return filename.endsWith(fileExtension)
        if fileExtension instanceof RegExp
            # console.log filename, fileExtension, fileExtension.test(filename)
            return fileExtension.test(filename)
        return false

    @createElement: (tag, classes = "", callback) ->
        element = document.createElement(tag)
        element.className = classes
        callback?(element)
        return element

    @removeChildNodes: (parentNode) ->
        while parentNode.firstChild?
            parentNode.removeChild(parentNode.firstChild)
        return parentNode

    @chooseFile: (alertMessage) ->
        if alertMessage
            alert alertMessage
        return dialog.showOpenDialog({properties: ['openFile']})

    @copyFile: (source, destination) ->
        try
            buffer = fs.readFileSync(source)
        catch error
            throw new Error("Could not read '#{source}'.")
        fs.writeFileSync(destination, buffer)
        return @

    @escapeNonAscii: (string) ->
        # asciiChars = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"
        # char code range: [32, 126]
        res = ""
        for char, i in string
            if 32 <= string.charCodeAt(i) <= 126
                res += char
            else
                res += "_"
        return res

    @confirm: (options) ->
        buttons = ["OK", "Cancel"]
        options.buttons = buttons
        return buttons[atom.confirm(options)] is "OK"
