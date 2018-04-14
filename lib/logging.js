'use babel'

const noop = () => {}

// The logger's main purpose it to only write to console output when atom is
// in development mode.
export default class Logger {
    constructor(shouldLog=atom.inDevMode.bind(atom)) {
        if (shouldLog()) {
            this.error = console.error.bind(console)
            this.log = console.log.bind(console)
            this.info = console.info.bind(console)
            this.debug = console.debug.bind(console)
        }
        else {
            this.error = noop
            this.log = noop
            this.info = noop
            this.debug = noop
        }
    }
}

export const defaultLogger = new Logger()
