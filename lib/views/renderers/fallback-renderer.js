'use babel'

import React from 'react'


export default class FallbackRenderer extends React.Component {
    static isBinary = false
    static description = 'Displays an error message'
    static type = 'fallback'
    static fileExtension = 'txt'

    static getName() {
        return 'FallbackRenderer'
    }

    render() {
        return <div className='fallback-message'>
            This annotation cannot be displayed correctly. :(<br />
            Change the annotation&apos;s type or<br />
            enable/install an according renderer.
        </div>
    }
}
