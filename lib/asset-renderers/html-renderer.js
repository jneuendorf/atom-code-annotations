'use babel'

import AssetRenderer from './asset-renderer'

export default class HtmlRenderer extends AssetRenderer {
    static parent = AssetRenderer
    static isBinary = false
    static description = 'Renders HTML inline (rich text)'
    static type = 'html'
    static fileExtension = 'html'

    _render(codeAnnotationManager) {
        // NOTE: wanted to use shadow dom. see http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/
        //       but javascript targeting inside shadow dom elements is weird...therefore there is the StandaloneHtmlRenderer
        const div = document.createElement('div')
        div.innerHTML = this.rawAnnotation.content
        return div
    }
}
