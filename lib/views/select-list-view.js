'use babel';

import {SelectListView, $$} from "atom-space-pen-views";
import path from "path";

export default class MySelectLiewView extends SelectListView {
    initialize() {
        super.initialize();
        this.panel = null;
        this.$$ = $$;
        return this.addClass('command-palette');
    }

    cancelled() {
        return this.hide();
    }

    toggle() {
        if ((this.panel ? this.panel.isVisible() : undefined)) {
            this.cancel();
        } else {
            this.show();
        }
    }

    beforeShow(items) {
        return items;
    }

    show(items) {
        this.storeFocusedElement();
        if (items) {
            items = this.beforeShow(items);
            this.setItems(items);
        }
        if (!this.panel) { this.panel = atom.workspace.addModalPanel({item: this}); }
        this.panel.show();
        this.focusFilterEditor();
        return this;
    }

    hide() {
        if (this.panel) {
            this.panel.hide();
        }
        return this;
    }

    confirmed(item) {
        this.cancel();
        this.afterConfirmed(item);
        return this;
    }
};
