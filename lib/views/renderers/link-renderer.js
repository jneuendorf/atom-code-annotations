'use babel'

import path from 'path'
import React from 'react'

import PropTypes from '../../prop-types'


// For details on 'webview' see:
// https://developer.chrome.com/apps/app_external#webview
export default class LinkRenderer extends React.Component {
    static propTypes = PropTypes.Renderer

    static isBinary = false
    static description = (
        'Shows the web page belonging to a URL. '
        + 'Start a file URL with <code>file://$NAME</code> where $NAME is a '
        + 'placeholder for the project named <code>NAME</code>.'
    )
    static type = 'link'
    static fileExtension = 'txt'

    static getName() {
        return 'LinkRenderer'
    }

    render() {
        let {content} = this.props
        const protocol = 'file://'
        if (content.startsWith(`${protocol}$`)) {
            const parts = content.slice(protocol.length).split(path.sep)
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
            content = `${protocol}${path.join(projectPath, ...parts.slice(1))}`
        }
        return <div className='webview-wrapper'>
            <span
                ref={element => this.loader = element}
                className='loading loading-spinner-large inline-block'
            />
            <webview
                ref={element => this.webview = element}
                src={content}
            />
        </div>
    }

    componentDidMount() {
        // this.webview.addEventListener('load', ...) does not work
        // thus we use setTimeout as heuristic.
        window.setTimeout(() => {
            // this.loader may be null if another annotation was rendered
            // within the timeout.
            this.loader && this.loader.remove()
        }, 3000)
    }
}
