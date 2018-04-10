'use babel'

import {SelectListView, $$} from 'atom-space-pen-views'

export default class MySelectLiewView extends SelectListView {
    initialize() {
        super.initialize()
        this.panel = null
        this.$$ = $$
        return this.addClass('command-palette')
    }

    cancelled() {
        this.hide()
    }

    toggle() {
        if ((this.panel ? this.panel.isVisible() : undefined)) {
            this.cancel()
        }
        else {
            this.show()
        }
    }

    show(items) {
        this.storeFocusedElement()
        if (items) {
            items = this.beforeShow(items)
            this.setItems(items)
        }
        if (!this.panel) {
            this.panel = atom.workspace.addModalPanel({item: this})
        }
        this.panel.show()
        this.focusFilterEditor()
    }

    beforeShow(items) {
        return items
    }

    hide() {
        if (this.panel) {
            this.panel.hide()
        }
    }

    confirmed(item) {
        this.cancel()
        this.afterConfirmed(item)
    }
}
