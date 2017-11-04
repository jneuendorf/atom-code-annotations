'use babel';

import SelectListView from "./select-list-view";
import path from "path";

export default class ShowAllView extends SelectListView {
    getFilterKey() {
        return "annotationName";
    }

    beforeShow(groupedItems) {
        const items = [];
        for (let editorPath in groupedItems) {
            const annotations = groupedItems[editorPath];
            for (let annotation of annotations) {
                items.push({
                    editorPath,
                    filename: path.basename(editorPath),
                    annotationName: annotation.name,
                    lineNumber: annotation.marker.getBufferRange().start.row
                });
            }
        }
        return items;
    }

    viewForItem({annotationName, filename, lineNumber}) {
        return this.$$(function() {
            return this.li({class: 'event'}, () => {
                this.div({class: 'pull-right'}, () => {
                    return this.span(`${filename} @ ${lineNumber + 1}`);
                });
                return this.span({title: annotationName}, annotationName);
            });
        });
    }

    confirmed({annotationName, filename, editorPath, lineNumber}) {
        this.cancel();
        atom.workspace.open(editorPath, {
            initialLine: lineNumber,
            // initialColumn: 0
            pending: true
        });
        // TODO: this is not working like that:
        // atom.workspace.getActiveTextEditor().getLastCursor().moveToFirstCharacterOfLine()
    }
};
