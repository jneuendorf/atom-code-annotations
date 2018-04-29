'use babel'

import {
    Disposable,
    CompositeDisposable,
    TextEditor as AtomTextEditor,
} from 'atom'
import React from 'react'
import PropTypes from 'prop-types'
import {isValidElementType} from 'react-is'
import fuzzaldrin from 'fuzzaldrin'
import classnames from 'classnames'

import {ValueError} from '../errors'


const propIsComponent = (props, propName, componentName) => {
    if (!props[propName] || !isValidElementType(props[propName])) {
        return new Error(
            `Invalid prop '${propName}' supplied to '${componentName}'.`)
    }
}
// Just for being closer to native PropTypes' functions.
propIsComponent.isRequired = propIsComponent

const noop = () => {}

const fuzzyFilter = (items, query, filterKeyForItem) => {
    if (query.length === 0) {
        return items
    }
    const scoredItems = []
    for (const item of items) {
        const string = filterKeyForItem ? filterKeyForItem(item) : item
        if (typeof(string) !== 'string') {
            throw new ValueError(
                'You must provide a \'filterKeyForItem\' prop for non-string items.'
            )
        }
        let score = fuzzaldrin.score(string, query)
        if (score > 0) {
            scoredItems.push({
                item,
                score
            })
        }
    }
    scoredItems.sort((a, b) => b.score - a.score)
    return scoredItems.map(i => i.item)
}


export default class AtomSelectList extends React.PureComponent {
    static propTypes = {
        itemComponent: propIsComponent.isRequired,
        items: PropTypes.array,
        maxResults: PropTypes.number,
        filter: PropTypes.func,
        filterKeyForItem: PropTypes.func,
        filterQuery: PropTypes.func,
        query: PropTypes.string,
        selectQuery: PropTypes.bool,
        order: PropTypes.func,
        emptyMessage: PropTypes.string,
        errorMessage: PropTypes.string,
        infoMessage: PropTypes.string,
        loadingMessage: PropTypes.string,
        loadingBadge: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]),
        initialSelectionIndex: PropTypes.number,
        itemsClassList: PropTypes.arrayOf(PropTypes.string),
        didChangeQuery: PropTypes.func,
        didChangeSelection: PropTypes.func,
        didConfirmSelection: PropTypes.func,
        didConfirmEmptySelection: PropTypes.func,
        didCancelSelection: PropTypes.func,
        initiallyVisibleItemCount: PropTypes.number,
        skipCommandsRegistration: PropTypes.bool,
        className: PropTypes.string,
    }
    static defaultProps = {
        items: [],
        maxResults: Infinity,
        filter: fuzzyFilter,
        emptyMessage: 'No matches found',
        initialSelectionIndex: 0,
        itemsClassList: [],
        didChangeQuery: noop,
        didChangeSelection: noop,
        didConfirmSelection: noop,
        didConfirmEmptySelection: noop,
        didCancelSelection: noop,
        initiallyVisibleItemCount: Infinity,
        skipCommandsRegistration: false,
        className: ''
    }

    state = {
        selectionIndex: null,
        query: '',
    }

    focus() {
        this.queryEditor.element.focus()
    }

    reset() {
        this.queryEditor.native.setText('')
    }

    selectAll() {
        this.queryEditor.native.selectAll()
    }

    didLoseFocus = event => {
        if (this.element.contains(event.relatedTarget)) {
            this.queryEditor.element.focus()
        }
        else if (document.hasFocus()) {
            this.cancelSelection()
        }
    }

    componentDidMount() {
        const {skipCommandsRegistration, selectQuery, query} = this.props
        this.disposables = new CompositeDisposable()
        if (!skipCommandsRegistration) {
            this.disposables.add(this.registerAtomCommands())
        }
        if (selectQuery) {
            this.queryEditor.native.selectAll()
        }
        else {
            this.queryEditor.native.clearSelections()
        }
        if (query) {
            this.queryEditor.native.setText(query)
        }
        this.disposables.add(
            this.queryEditor.native.onDidChange(this.didChangeQuery)
        )
        const editorElement = this.queryEditor.element
        editorElement.addEventListener('blur', this.didLoseFocus)
        this.disposables.add(new Disposable(() => {
            editorElement.removeEventListener('blur', this.didLoseFocus)
        }))
    }

    componentDidUpdate(prevProps, prevState) {
        const {selectionIndex} = this.state
        if (prevState.selectionIndex !== selectionIndex) {
            this.itemList.children[selectionIndex].scrollIntoView()
        }
    }

    componentWillUnmount() {
        this.disposables.dispose()
    }

    registerAtomCommands() {
        return atom.commands.add(this.element, {
            'core:move-up': event => {
                this.selectPrevious()
                event.stopPropagation()
            },
            'core:move-down': event => {
                this.selectNext()
                event.stopPropagation()
            },
            'core:move-to-top': event => {
                this.selectFirst()
                event.stopPropagation()
            },
            'core:move-to-bottom': event => {
                this.selectLast()
                event.stopPropagation()
            },
            'core:confirm': event => {
                this.confirmSelection()
                event.stopPropagation()
            },
            'core:cancel': event => {
                this.cancelSelection()
                event.stopPropagation()
            }
        })
    }

    render() {
        const {className} = this.props
        return <div
            ref={element => this.element = element}
            className={`select-list ${className}`}
        >
            <TextEditor mini={true} ref={element => this.queryEditor = element} />
            {/* {this.renderLoadingMessage()}
            {this.renderInfoMessage()}
            {this.renderErrorMessage()} */}
            {this.renderItems()}
        </div>
    }

    renderItems() {
        const {
            items,
            itemsClassList,
            initiallyVisibleItemCount,
            filter,
            filterKeyForItem,
            maxResults,
            order,
            itemComponent: ItemComponent,
            loadingMessage,
            emptyMessage,
        } = this.props
        const {query} = this.state
        const filteredItems = (
            filter(
                items,
                this.getFilterQuery(),
                filterKeyForItem
            )
            .slice(0, query ? maxResults : initiallyVisibleItemCount)
        )
        if (filteredItems.length > 0) {
            if (order) {
                filteredItems.sort(order)
            }
            return <ol
                ref={element => this.itemList = element}
                className={classnames('list-group', ...itemsClassList)}
            >
                {filteredItems.map((item, index) => {
                    const selected = this.getSelectedItem() === item
                    // TODO: use something real as key
                    return <span key={index} onClick={event => {
                        // event.stopPropagation()
                        this.didClickItem(index)}
                    }>
                        <ItemComponent
                            // key={index}
                            item={item}
                            query={query}
                            selected={selected}
                            index={index}
                            // onClick={() => this.didClickItem(index)}
                        />
                    </span>
                })}
            </ol>
        }
        else if (!loadingMessage && emptyMessage) {
            return this.renderEmptyMessage()
        }
        else {
            return null
        }
    }

    // renderLoadingMessage() {
    //     const {loadingMessage, loadingBadge} = this.props
    //     if (loadingMessage) {
    //         return <div className='loading'>
    //             <span
    //                 ref={element => this.loadingMessage = element}
    //                 className='loading-message'
    //             >
    //                 {loadingMessage}
    //             </span>
    //             {
    //                 loadingBadge
    //                 ? (
    //                     <span
    //                         ref={element => this.loadingBadge = element}
    //                         className='badge'
    //                     >
    //                         {loadingBadge}
    //                     </span>
    //                 )
    //                 : null
    //             }
    //         </div>
    //     }
    //     else {
    //         return null
    //     }
    // }
    //
    // renderInfoMessage() {
    //     const {infoMessage} = this.props
    //     if (infoMessage) {
    //         return <span ref={element => this.infoMessage = element}>
    //             {infoMessage}
    //         </span>
    //     }
    //     else {
    //         return null
    //     }
    // }
    //
    // renderErrorMessage() {
    //     const {errorMessage} = this.props
    //     if (errorMessage) {
    //         return <span ref={element => this.errorMessage = element}>
    //             {errorMessage}
    //         </span>
    //     }
    //     else {
    //         return null
    //     }
    // }

    renderEmptyMessage() {
        const {emptyMessage} = this.props
        if (emptyMessage) {
            return <span ref={element => this.emptyMessage = element}>
                {emptyMessage}
            </span>
        }
        else {
            return null
        }
    }

    getFilterQuery() {
        const {filterQuery} = this.props
        const query = (
            this.queryEditor
            ? this.queryEditor.native.getText()
            : ''
        )
        return (filterQuery ? filterQuery(query) : query)
    }

    didChangeQuery = () => {
        const {didChangeQuery} = this.props
        const query = this.getFilterQuery()
        this.setState({query}, () => {
            didChangeQuery(query)
        })
    }

    didClickItem(index) {
        this.focus()
        this.selectIndex(index)
        this.confirmSelection()
    }

    getSelectedItem() {
        const {items} = this.props
        const {selectionIndex} = this.state
        if (selectionIndex === undefined) {
            return null
        }
        return items[selectionIndex]
    }

    selectPrevious() {
        const {selectionIndex} = this.state
        if (selectionIndex === null) {
            this.selectLast()
        }
        else {
            this.selectIndex(selectionIndex - 1)
        }
    }

    selectNext() {
        const {selectionIndex} = this.state
        if (selectionIndex === null) {
            this.selectFirst()
        }
        else {
            this.selectIndex(selectionIndex + 1)
        }
    }

    selectFirst() {
        return this.selectIndex(0)
    }

    selectLast() {
        const {items} = this.props
        return this.selectIndex(items.length - 1)
    }

    // TODO: This method is unused. Should this API exist?
    selectNone() {
        return this.selectIndex(null)
    }

    selectIndex(index) {
        const {items, didChangeSelection} = this.props
        if (typeof(index) === 'number') {
            if (index >= items.length) {
                index = 0
            }
            else if (index < 0) {
                index = items.length - 1
            }
        }

        this.setState({selectionIndex: index}, () => {
            didChangeSelection(this.getSelectedItem())
        })
    }

    confirmSelection() {
        const {didConfirmSelection, didConfirmEmptySelection} = this.props
        const selectedItem = this.getSelectedItem()
        if (selectedItem) {
            didConfirmSelection(selectedItem)
        }
        else {
            didConfirmEmptySelection()
        }
    }

    cancelSelection() {
        const {didCancelSelection} = this.props
        didCancelSelection()
    }
}

/* eslint-disable react/no-multi-comp */
class TextEditor extends React.Component {
    constructor(props) {
        super(props)
        this.native = new AtomTextEditor(props)
        this.element = this.native.element
    }

    render() {
        return <span ref={element => this.span = element} />
    }

    componentDidMount() {
        this.span.appendChild(this.element)
    }

    componentWillUnmount() {
        this.native.destroy()
        this.span.remove()
    }
}


export class SelectListItem extends React.PureComponent {
    static propTypes = {
        item: PropTypes.shape({
            name: PropTypes.string.isRequired,
            displayName: PropTypes.string.isRequired,
            description: PropTypes.string,
            keyBindings: PropTypes.arrayOf(PropTypes.shape({
                command: PropTypes.string.isRequired,
                keystrokes: PropTypes.string.isRequired,
            })),
            tags: PropTypes.arrayOf(PropTypes.string),
        }).isRequired,
        query: PropTypes.string,
        selected: PropTypes.bool,
    }

    static defaultProps = {
        keyBindings: [],
    }

    render() {
        const {
            item: {name, displayName, description, keyBindings, tags},
            query,
            selected,
        } = this.props
        return <li className={classnames('event', 'two-lines', {selected})} data-event-name={name}>
            <div className='pull-right'>
                {
                    keyBindings
                    .filter(({command}) => command === name)
                    .map(keyBinding =>
                        <kbd key={keyBinding.keystrokes} className='key-binding'>
                            {/* {humanizeKeystroke(keyBinding.keystrokes)} */}
                            {keyBinding.keystrokes}
                        </kbd>
                    )
                }
            </div>
            <div>
                <div className='primary-line' title={name}>
                    {this.renderMatchedChars(displayName, query)}
                </div>
                {
                    selected
                    ? <div className='secondary-line' style={{display: 'flex'}}>
                        {description ? this.renderDescription(description, query) : null}
                        {
                            Array.isArray(tags)
                            ? this.renderTags(
                                tags
                                .map(t => [t, fuzzaldrin.score(t, query)])
                                .filter(([t, s]) => s > 0)
                                .sort((a, b) => a.s - b.s)
                                .map(([t, s]) => t),
                                query
                            )
                            : null
                        }
                    </div>
                    : null
                }
            </div>
        </li>
    }

    renderMatchedChars(text, query) {
        const children = []
        const matches = fuzzaldrin.match(text, query)
        let matchedChars = []
        let lastIndex = 0
        for (const matchIndex of matches) {
            const unmatched = text.substring(lastIndex, matchIndex)
            if (unmatched) {
                if (matchedChars.length > 0) {
                    children.push(<span className='character-match'>
                        {matchedChars.join('')}
                    </span>)
                    matchedChars = []
                }
                children.push(unmatched)
            }
            matchedChars.push(text[matchIndex])
            lastIndex = matchIndex + 1
        }

        if (matchedChars.length > 0) {
            children.push(<span className='character-match'>
                {matchedChars.join('')}
            </span>)
        }

        const unmatched = text.substring(lastIndex)
        if (unmatched) {
            children.push(unmatched)
        }
        return children
    }

    renderDescription(description, query) {
        return <div
            title={description}
            style={{
                flexGrow: 1,
                flexShrink: 1,
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
            }}
        >
            {this.renderMatchedChars(description, query)}
        </div>
    }

    renderTags(matchingTags, query) {
        console.log(
            matchingTags,
            matchingTags.reduce(
                (acc, tag, index) => [
                    ...acc,
                    'renderedTag',
                    'span'
                ],
                []
            )
        )
        if (matchingTags.length > 0) {
            return <ol style={{
                display: 'inline',
                marginLeft: '4px',
                flexShrink: 0,
                padding: 0,
            }}>
                <strong>matching tags: </strong>
                {matchingTags.reduce(
                    (acc, tag, index) => [
                        ...acc,
                        this.renderTag(tag, query),
                        (<span key={`${tag}Comma`}>, </span>)
                    ],
                    []
                ).slice(0, -1)}
            </ol>
        }
        return null
    }

    renderTag(tagText, query) {
        return <li key={tagText} style={{
            borderBottom: 0,
            display: 'inline',
            padding: 0,
        }}>
            {this.renderMatchedChars(tagText, query)}
        </li>
    }
}


// class ListItemView {
//     constructor(props) {
//         this.mouseDown = this.mouseDown.bind(this)
//         this.mouseUp = this.mouseUp.bind(this)
//         this.selected = props.selected
//         this.onClick = props.onClick
//         this.element = props.element
//         this.element.addEventListener('mousedown', this.mouseDown)
//         this.element.addEventListener('mouseup', this.mouseUp)
//         this.element.addEventListener('click', this.didClick)
//         if (this.selected) {
//             this.element.classList.add('selected')
//         }
//         this.domEventsDisposable = new Disposable(() => {
//             this.element.removeEventListener('mousedown', this.mouseDown)
//             this.element.removeEventListener('mouseup', this.mouseUp)
//             this.element.removeEventListener('click', this.didClick)
//         })
//         etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
//     }
//
//     mouseDown(event) {
//         event.preventDefault()
//     }
//
//     mouseUp(event) {
//         event.preventDefault()
//     }
//
//     didClick = event => {
//         event.preventDefault()
//         this.onClick()
//     }
//
//     destroy() {
//         this.element.remove()
//         this.domEventsDisposable.dispose()
//     }
//
//     update(props) {
//         this.element.removeEventListener('mousedown', this.mouseDown)
//         this.element.removeEventListener('mouseup', this.mouseUp)
//         this.element.removeEventListener('click', this.didClick)
//
//         this.element.parentNode.replaceChild(props.element, this.element)
//         this.element = props.element
//         this.element.addEventListener('mousedown', this.mouseDown)
//         this.element.addEventListener('mouseup', this.mouseUp)
//         this.element.addEventListener('click', this.didClick)
//         if (props.selected) {
//             this.element.classList.add('selected')
//         }
//
//         this.selected = props.selected
//         this.onClick = props.onClick
//         etch.getScheduler().updateDocument(this.scrollIntoViewIfNeeded.bind(this))
//     }
//
//     scrollIntoViewIfNeeded() {
//         if (this.selected) {
//             this.element.scrollIntoViewIfNeeded(false)
//         }
//     }
// }
