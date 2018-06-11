'use babel'

import {CompositeDisposable} from 'atom'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import ip from 'ip'
import QRCode from 'qrcode'

import {createTmpFile} from './utils'
import {defaultLogger as logger} from './logging'


class Server {
    static app = null
    static server = null
    static subscriptions = new CompositeDisposable()

    static init(addAnnotation) {
        const app = express()
        app.use(cors())
        app.use(bodyParser.json({limit: '20mb'}))
        app.get('/', (request, response) => {
            const editor = atom.workspace.getActiveTextEditor()
            if (atom.workspace.isTextEditor(editor)) {
                response.send(editor.getPath())
            }
            else {
                response.send('')
            }
        })
        app.post('/', async (request, response) => {
            console.log(request.body)
            const {
                title,
                content,
            } = request.body
            const type = 'image'
            try {
                await addAnnotation({
                    title,
                    type,
                    content,
                })
                response.send('success')
            }
            catch (error) {
                logger.error(error.message)
                response.send(error.message)
            }
        })
        this.app = app
    }

    static async showQrCode() {
        await this.start()
        const ipAdress = ip.address()
        const port = this.server.address().port
        console.log('listening on port', port)
        const tempPath = await createTmpFile('registerProject.png')
        await QRCode.toFile(
            tempPath,
            `http://${ipAdress}:${port}`,
            {errorCorrectionLevel: 'L', scale: 8},
        )
        const editor = await atom.workspace.open(tempPath)
        console.log(editor)
        const notification = atom.notifications.addInfo(
            (
                `Don't close this editor until you're done adding annotations! `
                + `The app adds annotations to the currently active text editor: `
                + `Now, open the desired file! ;)`
            ),
            {dismissable: true}
        )
        // NOTE: Work-around because 'editor.onDidDestroy' does not work.
        //       See https://github.com/atom/image-view/issues/177
        this.subscriptions.add(atom.workspace.onDidDestroyPaneItem(event => {
            const {item} = event
            if (item.constructor.name === 'ImageEditor') {
                if (item.file.getPath() === tempPath) {
                    notification.dismiss()
                    this.stop()
                }
            }
        }))
    }

    static start() {
        if (this.server) {
            return
        }
        return new Promise((resolve, reject) => {
            try {
                const server = this.app.listen(() => {
                    resolve(server)
                })
                this.server = server
            }
            catch (error) {
                reject(error)
            }
        })
    }

    static stop() {
        if (!this.server) {
            console.log('not closing because not running')
            return
        }
        return new Promise((resolve, reject) => {
            console.log('trying to close server')
            try {
                this.server.close(() => {
                    console.log('server closed')
                    this.server = null
                    resolve()
                })
            }
            catch (error) {
                reject(error)
            }
        })
    }

    static async destroy() {
        await this.stop()
        this.subscriptions.dispose()
    }
}

export {Server}
export default Server
