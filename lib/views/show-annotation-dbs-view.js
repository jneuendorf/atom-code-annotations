'use babel'

import path from 'path'

import SelectListModal from './atom-select-list-modal'
import {ANNOTATIONS_DB_FILENAME} from '../constants'


const openDbFile = async item => {
    const {projectPath} = item
    await atom.workspace.open(
        path.join(projectPath, ANNOTATIONS_DB_FILENAME),
        {pending: true}
    )
    atom.notifications.addWarning(`Don't break things!`)
}

export default class ShowAllView extends SelectListModal {
    constructor(props) {
        super({
            ...props,
            didConfirmSelection: openDbFile,
            filterKeyForItem: 'projectPath',
        })
    }
}
