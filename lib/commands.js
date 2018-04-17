'use babel'


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
            'code-annotations:delete-annotations': () =>
                annotationManager.deleteAnnotations(
                    atom.workspace
                    .getActiveTextEditor()
                    .getCursorBufferPositions()
                ),
            'code-annotations:show-all': () =>
                annotationManager.showAll(),
            'code-annotations:edit-raw': () =>
                annotationManager.showAnnotationDbs(),
            // Needed only for the keymap ('escape').
            'code-annotations:hide-container': event => {
                // make the event continue bubble upward
                event.abortKeyBinding()
                annotationManager.hideContainer()
            }
        }
    }
}
