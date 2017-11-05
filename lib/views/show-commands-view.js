'use babel'

import SelectListView from './select-list-view'
import CodeAnnotations from '../constants'

export default class ShowCommandsView extends SelectListView {
    initialize() {
        super.initialize()
        return this.atomWorkspaceView = atom.views.getView(atom.workspace)
    }

    getFilterKey() {
        return 'displayName'
    }

    getKeyBindings(ignoredNames) {
        const namePrefix = `${CodeAnnotations.PACKAGE_NAME}:`
        const displayNamePrefix = 'Code Annotations: '
        const allKeybindings = atom.commands.findCommands({target: this.atomWorkspaceView})
        const keybindings = []
        for (let keybinding of allKeybindings) {
            if (keybinding.name.startsWith(namePrefix) && !ignoredNames.includes(keybinding.name)) {
                keybindings.push({
                    name: keybinding.name,
                    displayName: keybinding.displayName.slice(displayNamePrefix.length)
                })
            }
        }
        return keybindings
    }

    beforeShow(ignoredNames) {
        if (!this.keybindings) {
            this.keybindings = this.getKeyBindings(ignoredNames)
        }
        return this.keybindings
    }

    viewForItem({name, displayName}) {
        return this.$$(function() {
            return this.li({class: 'event'}, () => {
                return this.span({title: displayName}, displayName)
            })
        })
    }

    confirmed({name, displayName}) {
        this.cancel()
        atom.commands.dispatch(this.atomWorkspaceView, name)
    }
}
