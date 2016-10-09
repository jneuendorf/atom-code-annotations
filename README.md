# Code Annotations ([Atom](http://atom.io) package)

## Description

This is an atom package for creating code annotations.
An annotation is a piece of content that has a name and can be displayed in atom.
While working only the name of the code annotation is visible but it can be shown by clicking on the pin icon (in the atom gutter)

![Basic usage](https://github.com/jneuendorf/code-annotations/raw/master/gifs/basic-usage.gif)

By default, this package can render the following kinds of content:

- images
- html
- links / URLs
- plain text

Further renderers can be added by installing code-annotation plugin packages.


## Usage

### Creation and destruction

Code annotations can be added and deleted from the context menu, from the `ShowCommandsView`, and of course from the command palette.
When adding or removing the position is the current (or last) cursor is relevant (so just right clicking to a certain position is insufficient (for now)).
A new annotation is added above the line of the cursor; for deleting one the cursor must be at the annotation's line.

Each annotation is identified by a name (so it must be unique among all annotations of the same project folder).

When creating an annotation its contents can be set in 2 ways:

1. from a file (for e.g. images)
2. from text input (for e.g. plain text)
	- All annotations from text input are displayed as plain text first. The type can be changed later.


### Navigating to annotations

With the `show-all` command a select list containing all package commands


### Shortcuts

There are only 2: `ctrl-alt-c ctrl-alt-c` and `escape`.

Yes, the first is what it looks like - `ctr-alt-c` twice in a row.
This shortcut shows a select list with the commands of the package (so this is kinda like a prefiltered command palette).

`escape` is for hiding the container (see next section).

The reasoning behind this is to avoid conflicts with other packages without making it harder to use the package without the mouse.


### Showing annotations (rendering)

Each annotation is associated with a file. The file extension of that file determines how the file contents are rendered in the popup (called `CodeAnnotationContainer`).
Thus the `hide-container` command (which is triggered on `escape`).

The container is made visible by clicking on the icon displayed in the [gutter](https://atom.io/docs/api/latest/Gutter) - currently this is a pin icon.


## Supported grammars

- [C](https://atom.io/packages/language-c)
- [C#](https://atom.io/packages/language-csharp)
- [CoffeeScript](https://atom.io/packages/language-coffee-script)
- [CSS](https://atom.io/packages/language-css)
- [C++](https://atom.io/packages/language-c)
- [GitHub Flavored Markdown](https://atom.io/packages/language-gfm)
- [Go](https://atom.io/packages/language-go)
- [Haskell](https://atom.io/packages/language-haskell)
- [HTML](https://atom.io/packages/language-html)
- [HTML (Ruby - ERB)](https://atom.io/packages/language-ruby)
- [Java](https://atom.io/packages/language-java)
- [JavaScript](https://atom.io/packages/language-javascript)
- [LaTeX](https://atom.io/packages/language-latex)
- [Less](https://atom.io/packages/language-less)
- [MATLAB](https://atom.io/packages/language-matlab)
- [Objective-C](https://atom.io/packages/language-objective-c)
- [Objective-C++](https://atom.io/packages/language-objective-c)
- [Octave](https://atom.io/packages/language-matlab)
- [Perl](https://atom.io/packages/language-perl)
- [Perl 6](https://atom.io/packages/language-perl)
- [PHP](https://atom.io/packages/language-php)
- [Python](https://atom.io/packages/language-python)
- [R](https://atom.io/packages/language-r)
- [Ruby](https://atom.io/packages/language-ruby)
- [Sass](https://atom.io/packages/language-sass)
- [Scala](https://atom.io/packages/language-scala)
- [SCSS](https://atom.io/packages/language-scss)
- [Shell Script](https://atom.io/packages/language-shellscript)
- [SQL](https://atom.io/packages/language-sql)
