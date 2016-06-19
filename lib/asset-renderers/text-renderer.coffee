HtmlRenderer = require './html-renderer'

module.exports = class TextRenderer extends HtmlRenderer

    @parent: HtmlRenderer
    @fileExtension: ".txt"
