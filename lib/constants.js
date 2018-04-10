'use babel'

export const ANNOTATIONS_DB_FILENAME = '.annotations.cson'
export const GUTTER_NAME = 'code-annotations'
export const PACKAGE_NAME = 'code-annotations'
export const DELETE_CONFIRM_MESSAGE = 'Really delete?'
export const REPLACE_CONFIRM_MESSAGE = similarAnnotations => {
    const n = similarAnnotations.length
    if (n === 1) {
        return (
            `There is a similar annotation on the same line ('${similarAnnotations[0].title}').`
            + `Do you want to replace it?`
        )
    }
    else {
        return (
            `There are ${n} similar annotations on the same line.`
            + `Do you want to replace all of them?`
        )
    }
}


export default {
    ANNOTATIONS_DB_FILENAME,
    GUTTER_NAME,
    PACKAGE_NAME,
    DELETE_CONFIRM_MESSAGE,
    REPLACE_CONFIRM_MESSAGE,
}
