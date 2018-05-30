# Code Annotations ([Atom](http://atom.io) package)

## Description

This is an atom package for creating code annotations.
An annotation is a piece of content with a title that can be displayed in [Atom](https://atom.io/).
Code Annotations will not show up in your code but can nonetheless be using along with a VCS.
Another advantage is that your annotations no longer depend on code comments meaning you can effectively comment code that does not have a comment syntax (e.g. [Support for comments in package.json](https://github.com/npm/npm/issues/4482)).
Annotations appear as icons in the Atom gutter and can be revealed by clicking these icons.

![Basic usage](https://github.com/jneuendorf/code-annotations/raw/master/gifs/basic-usage.gif)

By default, this package can render the following kinds of content:

- images
- html
- URLs
- plain text

Further renderers can be added by

- installing code-annotation plugin packages (for versions `^2` see the [example plugin](https://github.com/jneuendorf/code-annotations-test)) or
- creating Pull Requests.


## Usage

### Creation and destruction

Code annotations can be added and deleted from the packages menu and of course from the command palette.
When adding or removing the position is the current (or last) cursor is relevant (so just right clicking to a certain position is insufficient (for now)).
A new annotation is added above the line of the cursor; for deleting one the cursor must be at the annotation's line.

Each annotation is identified by a name (so it must be unique among all annotations of the same project folder).

When creating an annotation its contents can be set in 2 ways:

1. from a file (for e.g. images)
2. from text input (for e.g. plain text)
	- All annotations from text input are displayed as plain text first. The type can be changed later.


### Commands, shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| `add-annotation` | | Adds an annotation. Data is input using some dialogs. |
| `show-all` | | Displays all annotations of the current project. Choosing one opens the corresponding file at the annotated line. |
| `edit-raw` | | Opens `.annotations.cson` for editing annotations manually. |
| `hide-container` | `escape` | Hides/closes the annotation container. |
| `select-previous-annotation` | `up` | Displays the previous annotation in the list. |
| `select-next-annotation` | `down` | Displays the next annotation in the list. |
| `move-annotation-up` | `cmd-up` / `ctrl-up` | Moves the currently selected annotation up the list. |
| `move-annotation-down` | `cmd-down` / `ctrl-down` | Moves the currently selected annotation down the list. |
| `migrate` | | Migrates annotation data from `v2` to `v3`. |

(`cmd` is used for macOS, `ctrl` for Linux and Windows.)


### Showing annotations (rendering)

The container is made visible by clicking on the icon displayed in the [gutter](https://atom.io/docs/api/latest/Gutter) - a pin icon by default.
The `hide-container` command closes it (which is triggered on `escape`).


