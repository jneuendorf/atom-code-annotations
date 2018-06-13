# Code Annotations ([Atom](http://atom.io) package)

This is an atom package for creating code annotations.
An annotation is a piece of content with a title that can be displayed in [Atom](https://atom.io/).
Code Annotations will not show up in your code but can nonetheless be used along with a VCS.

An advantage over `v2.x` is that annotations no longer depend on code comments meaning you can effectively comment code that does not have a comment syntax (e.g. [comments in package.json](https://github.com/npm/npm/issues/4482)).
Annotations appear as icons in the Atom gutter and can be revealed by clicking these icons.

![Basic usage](https://github.com/jneuendorf/code-annotations/raw/master/gifs/basic-usage.gif)

By default, this package can render the 4 [types](#types) of content.
Further renderers can be added by

- installing code-annotation plugin packages (for versions `v2.x` see the [example plugin](https://github.com/jneuendorf/code-annotations-test)) or
- creating Pull Requests.


## Usage

### Basics

Code annotations can be added from the packages menu and of course from the command palette.
New annotations are added to the current cursor's line by default (it can be changed in one of the dialogs if needed).

Multiple annotations can be attached to the same line. So explanation and images can be used together for the same chunk of code.

All annotations are saved in `.annotations.cson` in the project root.
In `v2.x` there were stored in a `.code-annotations` directory.
If such an "old" directory exists it should be detected and you should run the `migrate` command (see [commands](#commands)).


### <a name="types"></a>Types of annotations

#### `image`

Renders images as `<img>` tags (currently supports png, gif, jpg and bmp).

#### `html`

Renders HTML as you would expect - the web way of rich text.

#### `link`

Renders the web page belonging to a URL.

Project relative files can be displayed by using a file URL starting with `file://$NAME` where `$NAME` is a placeholder for the project named `NAME`.

#### `text`

Renders plain text.


### <a name="commands"></a>Commands, shortcuts

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
| `show-qr-code` | | Shows the QR code that's required for the [mobile app](#app). |
| `migrate` | | Migrates annotation data from `v2` to `v3`. |

(`cmd` is used for macOS, `ctrl` for Linux and Windows.)


### Showing annotations (rendering)

The container is made visible by clicking on the icon displayed in the [gutter](https://atom.io/docs/api/latest/Gutter) - a pin icon by default.
The `hide-container` command closes it (which is triggered on `escape`).


## <a name="commands"></a>Mobile App

There is a mobile app belonging to this Atom package.
It is located in the `AtomCodeAnnotations` folder.

The app can be used for taking photos.
These photos can then be sent to Atom as code annotations.
In order for the app to send the photo it needs to know an IP address which it gets by reading the QR code that can be shown with the `show-qr-code` command.

### Distribution

#### iOS

The app should be deployable using Apple's *Ad Hoc Distribution*.

#### Android

TODO. These links look helpful though:

- https://stackoverflow.com/questions/35935060/
- https://facebook.github.io/react-native/docs/signed-apk-android.html


## Changelog (since `v2.x`)

See [releases](https://github.com/jneuendorf/code-annotations/releases).


## Contribution

### Setting up the package

```bash
apm develop code-annotations
cd ~/github/code-annotations
atom . --dev
```

or

```bash
git clone https://github.com/jneuendorf/code-annotations.git
cd code-annotations
apm link
atom .
# or
# apm link --dev
# atom . --dev
```

### Thanks to

- [edahlseng](https://github.com/edahlseng)
  for the motivation that led to `v3.0` and ideas for improving quality and
  performance of the package.
- [bradleyDean](https://github.com/bradleyDean)
  for feedback and inspiration
