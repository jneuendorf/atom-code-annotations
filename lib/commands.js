'use babel'

import {migrate} from './migrate'


export default class Commands {
    static boundTo(annotationManager) {
        return {
            'code-annotations:add-annotation': () => {
                const cursors = (
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPositions()
                )
                if (cursors.length === 1) {
                    annotationManager.addAnnotation(cursors[0].row)
                }
                else {
                    atom.notifications.addInfo(
                        'Adding an annotation to multiple cursors is not supported.'
                    )
                }
            },
            'code-annotations:show-all': () =>
                annotationManager.showAll(),
            'code-annotations:edit-raw': () =>
                annotationManager.showAnnotationDbs(),
            // Needed only for the keymap ('escape').
            'code-annotations:hide-container': event => {
                annotationManager.hideContainer()
            },
            'code-annotations:select-previous-annotation': event => {
                annotationManager.container.selectPrev()
            },
            'code-annotations:select-next-annotation': event => {
                annotationManager.container.selectNext()
            },
            'code-annotations:move-annotation-up': event => {
                annotationManager.container.moveSelectedUp()
            },
            'code-annotations:move-annotation-down': event => {
                annotationManager.container.moveSelectedDown()
            },

            'code-annotations:migrate': () => {
                migrate()
            },
        }
    }
}
