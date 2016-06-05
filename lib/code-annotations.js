'use babel';

import CodeAnnotationsView from './code-annotations-view';
import { CompositeDisposable } from 'atom';

export default {

  codeAnnotationsView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.codeAnnotationsView = new CodeAnnotationsView(state.codeAnnotationsViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.codeAnnotationsView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-annotations:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.codeAnnotationsView.destroy();
  },

  serialize() {
    return {
      codeAnnotationsViewState: this.codeAnnotationsView.serialize()
    };
  },

  toggle() {
    console.log('CodeAnnotations was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
