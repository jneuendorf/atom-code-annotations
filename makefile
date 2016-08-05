compile_coffee:
	coffee --compile --output compiled_source ./lib

optimize_require_js: compile_coffee
	r.js -o build.js

all: optimize_require_js
