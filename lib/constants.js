'use babel'

export default {
    // ASSET_DIR_NAME: '.code-annotations',
    // ASSET_NAMES_FILE: '.names.js',
    ANNOTATIONS_FILENAME: '.annotations.cson',
    CODE_KEYWORD: ' CODE-ANNOTATION: ',
    GUTTER_NAME: 'code-annotations',
    PACKAGE_NAME: 'code-annotations',
    SINGLE_LINE_WHITESPACE_REGEX_STR: '[ \\t]*',
    WHITESPACE_ONLY_REGEX: /^\s*$/,
    WHITESPACE_REGEX_STR: '\\s*',

    DELETE_CONFIRM_MESSAGE: 'Really delete?',
    REPLACE_CONFIRM_MESSAGE: name => `Asset with name '${name}' already exists. Replace it?`,
    // CREATE_ASSET_DIRECTORY_CONFIRM_MESSAGE: (editorPath) =>
    //     "There is no asset directory where for '#{editorPath}'. Create one and continue?"
}
