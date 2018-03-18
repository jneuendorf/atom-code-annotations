'use babel'

export default {
    ANNOTATIONS_FILENAME: '.annotations.cson',
    GUTTER_NAME: 'code-annotations',
    PACKAGE_NAME: 'code-annotations',

    DELETE_CONFIRM_MESSAGE: 'Really delete?',
    REPLACE_CONFIRM_MESSAGE: similarAnnotations => {
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
}
