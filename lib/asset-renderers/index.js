'use babel'

import AssetRenderer from './asset-renderer'
import HtmlRenderer from './html-renderer'
import ImageRenderer from './image-renderer'
import LinkRenderer from './link-renderer'
import TextRenderer from './text-renderer'


const concreteRendererClasses = {
    HtmlRenderer,
    ImageRenderer,
    LinkRenderer,
    TextRenderer,
}
const rendererClasses = {
    AssetRenderer,
    ...concreteRendererClasses,
}

const rendererClassesByType = {}
for (const rendererClass of Object.values(rendererClasses)) {
    rendererClassesByType[rendererClass.type] = rendererClass
}


export {
    AssetRenderer,
    HtmlRenderer,
    ImageRenderer,
    LinkRenderer,
    TextRenderer,
    rendererClassesByType as renderersByType,
    concreteRendererClasses as concreteRenderers,
}
export default {
    ...rendererClasses,
    byType: rendererClassesByType,
    concrete: concreteRendererClasses,
}
