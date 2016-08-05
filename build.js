// see:
// 1. http://requirejs.org/docs/optimization.html
// 2. https://github.com/requirejs/r.js/blob/master/build/example.build.js
({
    baseUrl: "compiled_source",
    name: "main",
    out: "main-built.js",
    paths: {
        // jquery: "empty:"
        main: "code-annotation-manager"
    }
})
