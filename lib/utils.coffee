module.exports = class Utils

    @fileHasType: (filename, fileType) ->
        if typeof fileType is "string"
            # TODO
            return filename.endsWith(fileType)
        if fileType instanceof RegExp
            console.log filename, fileType, fileType.test(filename)
            return fileType.test(filename)
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
