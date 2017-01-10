dialog = require("remote").dialog
fs = require "fs"
path = require "path"


module.exports = class Utils

    @createElement: (tag, classes = "", callback) ->
        element = document.createElement(tag)
        element.className = classes
        callback?(element)
        return element

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

    @createDirectory: (dirPath) ->
        fs.mkdirSync(dirPath)
        return @

    @createFile: (filePath, content = "") ->
        if filePath instanceof Array
            filePath = path.join.apply(path, filePath)
        fs.writeFileSync(filePath, content)
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

    @getGutterWithName: (editor, gutterName) ->
        for gutter in editor.getGutters() when gutter.name is gutterName
            return gutter
        # console.log "editor was", editor
        debugger
        return null

    @camelToKebab: (str) ->
        return str[0].toLowerCase() + str.slice(1).replace /([A-Z])/g, (upperCaseChar) ->
            return '-' + upperCaseChar.toLowerCase()
