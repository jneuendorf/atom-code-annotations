'use babel';

import SelectListView from "./select-list-view";

export default class ChangeTypeView extends SelectListView {
    initialize() {
        super.initialize();
        // set from the outside (in CodeAnnotationContainer)
        return this.codeAnnotationContainer = null;
    }

    getFilterKey() {
        return "searchString";
    }

    beforeShow(rendererClasses) {
        const items = [];
        for (let rendererClass of rendererClasses) {
            var fileExtension, fileExtensionLabel;
            if (typeof rendererClass.fileExtension !== "string") {
                fileExtension = rendererClass.fileExtension.join(" ");
                fileExtensionLabel = rendererClass.fileExtension.join(", ");
            } else {
                ({ fileExtension } = rendererClass);
                fileExtensionLabel = rendererClass.fileExtension;
            }
            items.push({
                name: rendererClass.getName(),
                fileExtension,
                fileExtensionLabel,
                searchString: `${rendererClass.getName()} ${fileExtension}`,
                rendererClass
            });
        }
        return items;
    }

    viewForItem({name, fileExtensionLabel}) {
        return this.$$(function() {
            return this.li({class: 'event'}, () => {
                this.div({class: 'pull-right'}, () => {
                    return this.span(`(${fileExtensionLabel})`);
                });
                return this.span({title: name}, name);
            });
        });
    }

    confirmed({rendererClass}) {
        this.cancel();
        this.codeAnnotationContainer.changeAnnotationType(rendererClass);
    }
};
