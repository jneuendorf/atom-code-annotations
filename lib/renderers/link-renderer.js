'use babel'

import path from 'path'
import React from 'react'

import PropTypes from '../prop-types'


// TODO: Add loader icon: https://stackoverflow.com/a/16485533/6928824
// TODO: Add message on load error: https://stackoverflow.com/a/18552771/6928824
export default class LinkRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = (
        'Shows the web page belonging to a URL. '
        + 'Start a file URL with <code>file://$NAME</code> as variable '
        + 'for the project path ending with <code>NAME</code>.'
    )
    static type = 'link'
    static fileExtension = 'txt'

    static getName() {
        return 'LinkRenderer'
    }

    render() {
        let {content} = this.props
        if (content.startsWith('$')) {
            const parts = content.split(path.sep)
            const pathVariableName = parts[0].slice(1)
            const projectPath = (
                atom.project.getDirectories()
                .filter(directory => directory.getBaseName() === pathVariableName)
                .map(directory => directory.getPath())
                [0]
            )
            if (!projectPath) {
                atom.notifications.addWarning(
                    `Invalid project path variable '${pathVariableName}' for link annotation.`
                )
                return null
            }
            content = path.join(projectPath, ...parts.slice(1))
        }
        return <webview src={content} />
    }
}
