'use babel'

import React from 'react'
import ReactDom from 'react-dom'
import AtomSelectList from './atom-select-list-react'


export default class SelectListModal {
    panel = null
    element = null
    previouslyFocusedElement = null

    constructor(props={}) {
        this.props = props
        this.pseudoParent = document.createElement('div')
    }

    render(props={}) {
        return ReactDom.render(
            <AtomSelectList
                className='command-palette'
                {...this.props}
                {...props}
                didCancelSelection={this.didCancelSelection}
                didConfirmSelection={this.didConfirmSelection}
            />,
            this.pseudoParent,
        )
    }
    // NOTE: Use the version below for React >= 17.
    //       See https://reactjs.org/docs/react-dom.html#render
    // render() {
    //     const promise = new Promise((resolve, reject) => {
    //         ReactDom.render(
    //             <AtomSelectList
    //                 ref={element => this.element = element}
    //                 className='command-palette'
    //                 didCancelSelection={this.didCancelSelection}
    //                 didConfirmSelection={this.didConfirmSelection}
    //                 {...this.props}
    //             />,
    //             this.pseudoParent,
    //             () => {
    //                 resolve(this.element)
    //             }
    //         )
    //     })
    //     return promise
    // }

    didConfirmSelection = item => {
        const {didConfirmSelection} = this.props
        this.hide()
        didConfirmSelection && didConfirmSelection(item)
    }

    didCancelSelection = () => {
        const {didCancelSelection} = this.props
        this.hide()
        didCancelSelection && didCancelSelection()
    }

    toggle() {
        if (this.panel && this.panel.isVisible()) {
            return this.hide()
        }
        else {
            return this.show()
        }
    }

    // @param props {Object} If given the list will be rerendered.
    show(props=null) {
        if (!this.panel) {
            if (!this.element || props) {
                this.element = this.render(props)
            }
            this.panel = atom.workspace.addModalPanel({item: this.element.element})
        }

        if (this.props.preserveLastSearch) {
            this.element.selectAll()
        }
        else {
            this.element.reset()
        }

        this.previouslyFocusedElement = document.activeElement
        this.panel.show()
        this.element.focus()
    }

    hide() {
        this.panel.hide()
        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus()
            this.previouslyFocusedElement = null
        }
    }

    destroy() {
        if (this.panel) {
            this.hide()
            ReactDom.unmountComponentAtNode(
                atom.views.getView(this.panel)
            )
            this.element = null
            this.panel.destroy()
        }
        else {
            ReactDom.unmountComponentAtNode(this.pseudoParent)
        }
    }
}
