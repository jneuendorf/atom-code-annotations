module.exports =
    C: "//"
    CoffeeScript: "#"
    CSS:
        begin: "/*"
        end: "/*"
    "C++": "//"
    "GitHub Markdown":
        begin: "<!--"
        end: "-->"
    HTML:
        begin: "<!--"
        end: "-->"
    "HTML (Ruby - ERB)":
        begin: "<%+#"
        end: "%>"
    Java: "//"
    JavaScript: "//"
    LaTeX: "%"
    PHP: ["//", "#"]
    Python: "#"
    Ruby: "#"
    "Shell Script": "#"
    SCSS: "//"
    Sass: "//"

    # creates the same kinf of object for all language data (independent of how it was written down)
    format: (value) ->
        if not value?
            return null
        # string => single line comment + no alternatives
        if typeof value is "string"
            return {
                begin: value
                end: ""
            }
        # block comment + no alternatives
        if value.begin? and value.end?
            return value
        # assume array given <=> multiple comment alternatives => format each as 1 of the 2 above
        return (@format(item) for item in value)
