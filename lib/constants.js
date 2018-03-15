'use babel'

export default {
    ANNOTATIONS_FILENAME: '.annotations.cson',
    GUTTER_NAME: 'code-annotations',
    PACKAGE_NAME: 'code-annotations',

    DELETE_CONFIRM_MESSAGE: 'Really delete?',
    REPLACE_CONFIRM_MESSAGE: name => `Asset with name '${name}' already exists. Replace it?`,
    // CREATE_ASSET_DIRECTORY_CONFIRM_MESSAGE: (editorPath) =>
    //     "There is no asset directory where for '#{editorPath}'. Create one and continue?"
}
