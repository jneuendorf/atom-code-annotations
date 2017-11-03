'use babel'

const commentsByGrammar = {
    'Babel ES6 JavaScript': '//',
    C: '//',
    'C#': '//',
    CoffeeScript: '#',
    CSS: {
        begin: '/*',
        end: '*/'
    },
    'C++': '//',
    'GitHub Markdown': {
        begin: '<!--',
        end: '-->'
    },
    Go: '//',
    Haskell: '--',
    HTML: {
        begin: '<!--',
        end: '-->'
    },
    'HTML (Ruby - ERB)': {
        begin: '<%+#',
        end: '%>'
    },
    Java: '//',
    JavaScript: '//',
    LaTeX: '%',
    Less: '//',
    MATLAB: '%',
    'Objective-C': '//',
    'Objective-C++': '//',
    Octave: [
        '#', '%'
    ],
    Perl: '#',
    'Perl 6': '#',
    PHP: [
        '//', '#'
    ],
    Python: '#',
    R: '#',
    Ruby: '#',
    Sass: '//',
    Scala: '//',
    SCSS: '//',
    'Shell Script': '#',
    SQL: '--',
}


const normalizeComments = function(comments) {
    const normalizeComment = function(comment) {
        if (comment) {
            // string => single line comment
            if (typeof(comment) === 'string') {
                return {begin: comment, end: ''}
            }
            // block comment
            if (comment.begin != null && comment.end != null) {
                return comment
            }
        }
        return null
    }

    const normalized = (
        Array.isArray(comments)
        ? comments.map(comment => normalizeComment(comment))
        : [normalizeComment(comments)]
    )
    return normalized.filter(item => item)
}

// creates the same kind of object for all language data (independent of how it was written down)
const normalized = function(commentsByGrammar) {
    const normalized = {}
    for (const [grammar, comments] of Object.entries(commentsByGrammar)) {
        // TODO: remove '[0]' once regex search is adjusted
        normalized[grammar] = normalizeComments(comments)[0]
    }
    return normalized
}


export default normalized(commentsByGrammar)
