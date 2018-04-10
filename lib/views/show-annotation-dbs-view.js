'use babel'

import path from 'path'

import SelectListView from './select-list-view'
import {ANNOTATIONS_DB_FILENAME} from '../constants'


export default class ShowAnnotationDbsView extends SelectListView {
    beforeShow(items) {
        return items.map(annotationsDb => annotationsDb.getProjectPath())
    }

    viewForItem(projectPath) {
        return this.$$(function() {
            return this.li({class: 'event'}, () => {
                // TODO: truncate long paths
                return this.span({title: projectPath}, projectPath)
            })
        })
    }

    async confirmed(projectPath) {
        this.cancel()
        await atom.workspace.open(
            path.join(projectPath, ANNOTATIONS_DB_FILENAME),
            {pending: true}
        )
        atom.notifications.addWarning(`Don't break things!`)
    }
}
