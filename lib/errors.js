// See:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling#Exception_handling_statements
// https://stackoverflow.com/a/5251506/6928824
// https://akwuh.me/t/1/
// function MyError(message) {
//     this.message = message
//     this.stack = (new Error()).stack
// }
// MyError.prototype = Object.create(Error.prototype)
// MyError.prototype.name = "MyError"


// We don't wanna use a hacky subclass of Error because it's hacky and because
// we never really need `new MyError() instanceof Error` to be true since
// we only check an error's type against one of our concrete error classes.
// So we use something that behaves similar to the native Error.
class MyError {
    constructor(message='') {
        this.message = message
        this.stack = (new Error()).stack
    }

    get name() {
        return this.constructor.name
    }

    toString() {
        if (this.message) {
            return `${this.name}: ${this.message}`
        }
        return this.name
    }
}


export class ValueError extends MyError {}

export class AbortError extends MyError {}
