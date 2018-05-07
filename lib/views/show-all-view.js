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
        pending: true
    })
}

const jumpToLine = item => {
    const {
        projectPath,
        relativePath,
        lineNumber,
    } = item
    const absolutePath = path.join(projectPath, relativePath)
    const editor = (
        atom.workspace.getTextEditors()
        .filter(editor => editor.getPath() === absolutePath)
        [0]
    )
    // Only jump to already open text editors.
    if (editor) {
        const pane = atom.workspace.getCenter().getPanes()[0]
        pane.activateItem(editor)
        // Format is [row, column].
        const position = [lineNumber - 1, 0]
        editor.scrollToBufferPosition(position, {center: true})
        editor.setCursorBufferPosition(position)
    }
}


export default class ShowAllView extends SelectListModal {
    constructor(props) {
        super({
            ...props,
            didConfirmSelection: openSelectedAnnotation,
            didChangeSelection: jumpToLine,
            filterKeyForItem: 'name',
        })
    }
}
