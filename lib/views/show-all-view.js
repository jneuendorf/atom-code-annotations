'use babel'

import path from 'path'

import SelectListModal from './atom-select-list-modal'


const openSelectedAnnotation = item => {
    const {
        projectPath,
        relativePath,
        lineNumber,
    } = item
    atom.workspace.open(path.join(projectPath, relativePath), {
        initialLine: lineNumber - 1,
        // initialColumn: 0
        pending: true
    })
    // TODO: this is not working like that:
    // atom.workspace.getActiveTextEditor().getLastCursor().moveToFirstCharacterOfLine()
}


export default class ShowAllView extends SelectListModal {
    constructor(props) {
        super({
            ...props,
            didConfirmSelection: openSelectedAnnotation,
            filterKeyForItem: 'name',
        })
    }
}
