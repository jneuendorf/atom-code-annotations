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
