# path = require 'path'
# fs = require 'fs-plus'
Dialog = require './dialog'
# {repoForPath} = require "./helpers"

module.exports = class CodeAnnotationNameDialog extends Dialog

    constructor: (@initialPath) ->
        super({
            prompt: 'Enter a name for the code annotation\'s asset.'
            iconClass: 'pencil'
        })

    _submit: (name) ->
        if name
            @close().onSubmitCallback(name)
            return @
        atom.notifications.addWarning("Asset name can't be empty.")
