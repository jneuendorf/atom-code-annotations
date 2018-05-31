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


const component = (props, propName, componentName) => {
    if (props[propName] !== undefined && !isValidElementType(props[propName])) {
        return new Error(
            `Invalid prop '${propName}' supplied to '${componentName}'.`)
    }
}
// Just for being closer to native PropTypes' functions.
component.isRequired = (props, propName, componentName) => {
    if (!isValidElementType(props[propName])) {
        return new Error(
            `Invalid prop '${propName}' supplied to '${componentName}'.`)
    }
}
PropTypes.component = component

const LIST_ITEM_DATA_PROPS = {
    item: PropTypes.shape({
        name: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        description: PropTypes.string,
        rightText: PropTypes.string,
        tags: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    query: PropTypes.string,
    selected: PropTypes.bool,
}

// TODO: fix this:
/* eslint-disable react/no-multi-comp */
export class ListItem extends React.PureComponent {
    static propTypes = {
        twoLines: PropTypes.bool.isRequired,
        firstLine: PropTypes.node.isRequired,
        secondLine: PropTypes.node,
        rightBlock: PropTypes.node,
        ...LIST_ITEM_DATA_PROPS,
    }

    static defaultProps = {
        twoLines: false,
        secondLine: null,
        rightBlock: null,
    }

    render() {
        const {
            firstLine,
            secondLine,
            rightBlock,
            selected,
        } = this.props
        return <li
            className={classnames(
                'event',
                {
                    'two-lines': secondLine != null,
                    selected,
                }
            )}
        >
            {rightBlock}
            <div>
                {firstLine}
                {secondLine}
            </div>
        </li>
    }
}

export class RightBlock extends React.PureComponent {
    static propTypes = LIST_ITEM_DATA_PROPS

    render() {
        const {
            item: {rightText},
        } = this.props
        if (!rightText) {
            return null
        }
        return <div className='pull-right'>
            {rightText}
        </div>
    }
}

export class FirstLine extends React.PureComponent {
    static propTypes = LIST_ITEM_DATA_PROPS

    render() {
        const {
            item: {name, displayName},
            query,
        } = this.props
        return <div className='primary-line' title={name}>
            <MatchedChars text={displayName} query={query} />
        </div>
    }
}

export class SecondLine extends React.PureComponent {
    static propTypes = LIST_ITEM_DATA_PROPS

    render() {
        const {
            item,
            query,
            selected,
        } = this.props
        return selected
        ? <div className='secondary-line' style={{display: 'flex'}}>
            <Description item={item} query={query} selected={selected} />
            <Tags item={item} query={query} selected={selected} />
        </div>
        : null
    }
}

export class Description extends React.PureComponent {
    static propTypes = LIST_ITEM_DATA_PROPS

    render() {
        const {
            item: {description},
            query,
        } = this.props
        if (!description) {
            return null
        }
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
            <MatchedChars text={description} query={query} />
        </div>
    }
}

export class Tags extends React.PureComponent {
    static propTypes = LIST_ITEM_DATA_PROPS

    render() {
        const {
            item: {tags},
            query,
        } = this.props
        if (!Array.isArray(tags) || tags.length === 0) {
            return null
        }

        const matchingTags = (
            tags
            .map(tag => [tag, fuzzaldrin.score(tag, query)])
            .filter(([tag, score]) => score > 0)
            .sort(([tag1, score1], [tag2, score2]) => score1 - score2)
            .map(([tag, score]) => tag)
        )
        if (matchingTags.length === 0) {
            return null
        }

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
                    (
                        <li key={tag} style={{
                            borderBottom: 0,
                            display: 'inline',
                            padding: 0,
                        }}>
                            <MatchedChars text={tag} query={query} />
                        </li>
                    ),
                    (
                        <span key={`${tag}Comma`}>, </span>
                    ),
                ],
                []
            ).slice(0, -1)}
        </ol>
    }
}

export class MatchedChars extends React.PureComponent {
    static propTypes = {
        text: PropTypes.string.isRequired,
        query: PropTypes.string.isRequired,
    }

    render() {
        const {text, query} = this.props
        const children = []
        const matches = fuzzaldrin.match(text, query)
        let matchedChars = []
        let lastIndex = 0
        // let spanCounter = 0
        for (const matchIndex of matches) {
            const unmatched = text.substring(lastIndex, matchIndex)
            if (unmatched) {
                if (matchedChars.length > 0) {
                    children.push(this.renderSpan(matchedChars, `${matchIndex}_${query}`))
                    matchedChars = []
                }
                children.push(this.renderSpan(unmatched, `${matchIndex}_${query}`))
            }
            matchedChars.push(text[matchIndex])
            lastIndex = matchIndex + 1
        }

        if (matchedChars.length > 0) {
            children.push(this.renderSpan(matchedChars, `rest_${query}`))
        }

        const unmatched = text.substring(lastIndex)
        if (unmatched) {
            children.push(this.renderSpan(unmatched, `rest_${query}`))
        }
        return children
    }

    // Can't be a subcomponent because the keys need to be on the children
    // directly on not on a child's subcomponent.
    renderSpan(chars, id) {
        const isArray = Array.isArray(chars)
        const text = (
            isArray
            ? chars.join('')
            : chars
        )
        return <span
            className={classnames({'character-match': isArray})}
            key={`${id}_${text}`}
        >
            {text}
        </span>
    }
}



export class SimpleListItem extends React.PureComponent {
    render() {
        const {props} = this
        return <ListItem
            firstLine={<FirstLine {...props} />}
            rightBlock={<RightBlock {...props} />}
            {...props}
        />
    }
}

export class DetailedListItem extends React.PureComponent {
    render() {
        const {props} = this
        return <ListItem
            firstLine={<FirstLine {...props} />}
            secondLine={<SecondLine {...props} />}
            rightBlock={<RightBlock {...props} />}
            {...props}
        />
    }
}



const noop = () => {}

const fuzzyFilter = (items, query, filterKeyForItem) => {
    if (query.length === 0) {
        return items
    }
    const scoredItems = []
    for (const item of items) {
        let string
        if (filterKeyForItem) {
            if (typeof(filterKeyForItem) === 'function') {
                string = filterKeyForItem(item)
            }
            else if (typeof(filterKeyForItem) === 'string') {
                string = item[filterKeyForItem]
            }
        }
        else {
            string = item
        }
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
        itemComponent: PropTypes.component,
        items: PropTypes.array,
        keyForItem: PropTypes.func,
        maxResults: PropTypes.number,
        filter: PropTypes.func,
        filterKeyForItem: PropTypes.oneOfType([
            PropTypes.func,
            PropTypes.string,
        ]),
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
        itemComponent: SimpleListItem,
        items: [],
        keyForItem: (item, index) => {
            console.warn(
                'You should provide an own function for associating each of '
                + 'the select list\'s items with a unique key for React. '
                + 'This default function is either slow or incorrect!'
            )
            try {
                return JSON.stringify(item)
            }
            catch (error) {
                return index
            }
        },
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

    constructor(props) {
        super(props)
        this.state = {
            selectionIndex: null,
            query: '',
            filteredItems: props.items,
        }
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
        if (prevState.selectionIndex !== selectionIndex && selectionIndex != null) {
            // Better stay save here.
            if (typeof(Element.prototype.scrollIntoViewIfNeeded) === 'function') {
                this.itemList.children[selectionIndex].scrollIntoViewIfNeeded()
            }
            else {
                this.itemList.children[selectionIndex].scrollIntoView()
            }
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
            itemsClassList,
            keyForItem,
            itemComponent: ItemComponent,
            loadingMessage,
            emptyMessage,
        } = this.props
        const {query, selectionIndex, filteredItems} = this.state

        if (filteredItems.length > 0) {
            return <ol
                ref={element => this.itemList = element}
                className={classnames('list-group', ...itemsClassList)}
            >
                {filteredItems.map((item, index) => {
                    // const selected = this.getSelectedItem() === item
                    const selected = index === selectionIndex
                    const key = keyForItem(item, index)
                    return <span key={key} onClick={event => {
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
        const filteredItems = this.computeFilteredItems(query)
        this.setState({query, filteredItems}, () => {
            didChangeQuery(query)
            this.selectNone()
        })
    }

    didClickItem(index) {
        this.focus()
        this.selectIndex(index)
        this.confirmSelection()
    }

    computeFilteredItems(query) {
        const {
            items,
            initiallyVisibleItemCount,
            filter,
            filterKeyForItem,
            maxResults,
            order,
        } = this.props
        const filteredItems = (
            filter(
                items,
                query,
                filterKeyForItem
            )
            .slice(0, query ? maxResults : initiallyVisibleItemCount)
        )
        if (order) {
            filteredItems.sort(order)
        }
        return filteredItems
    }

    getSelectedItem() {
        // const {items} = this.props
        const {selectionIndex, filteredItems} = this.state
        if (selectionIndex === undefined) {
            return null
        }
        return filteredItems[selectionIndex]
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

    selectNone() {
        return this.selectIndex(null)
    }

    selectIndex(index) {
        const {didChangeSelection} = this.props
        const {filteredItems} = this.state
        if (typeof(index) === 'number') {
            if (index >= filteredItems.length) {
                index = 0
            }
            else if (index < 0) {
                index = filteredItems.length - 1
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
