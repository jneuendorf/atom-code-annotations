'use babel'

import path from 'path'

import SelectListView from './select-list-view'


export default class ShowAllView extends SelectListView {
    getFilterKey() {
        return 'annotationName'
    }

    viewForItem({title, relativePath, lineNumber}) {
        return this.$$(function() {
            return this.li({class: 'event'}, () => {
                this.div({class: 'pull-right'}, () => {
                    return this.span(`${relativePath} (line ${lineNumber})`)
                })
                return this.span({title}, title)
            })
        })
    }

    confirmed(item) {
        this.cancel()
        const {projectPath, relativePath, lineNumber} = item
        atom.workspace.open(path.join(projectPath, relativePath), {
            initialLine: lineNumber - 1,
            // initialColumn: 0
            pending: true
        })
        // TODO: this is not working like that:
        // atom.workspace.getActiveTextEditor().getLastCursor().moveToFirstCharacterOfLine()
    }
}
