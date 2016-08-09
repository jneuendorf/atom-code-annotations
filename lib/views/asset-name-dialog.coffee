Dialog = require './dialog'


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

    ###
    TODO: add checkbox for moving the asset instead of copying it
    <div class="checkbox">
        <label for="core.allowPendingPaneItems">
            <input id="core.allowPendingPaneItems" type="checkbox">
            <div class="setting-title">Allow Pending Pane Items</div>
        </label>
        <div class="setting-description">Allow items to be previewed without adding them to a pane permanently, such as when single clicking files in the tree view.</div>
    </div>
    ###
