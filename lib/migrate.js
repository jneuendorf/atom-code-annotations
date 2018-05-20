'use babel'

import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import {Directory} from 'atom'
import cson from 'season'
import FileHound from 'filehound'

import {filterAsync, readFileBase64} from './utils'


export const migrate = async () => {
    const migratables = await detectMigratables()
    try {
        await Promise.all(
            migratables.map(migratable => migrateProject(migratable))
        )
        atom.notifications.addSuccess(
            `Successfully migrated ${migratables.length} projects.`
        )
    }
    catch (error) {
        atom.notifications.addError(error.message)
    }
}

export const detectMigratables = async () => {
    return await filterAsync(
        atom.project.getDirectories(),
        dir => dir.getSubdirectory('.code-annotations').exists(),
    )
}


const migrateProject = async dir => {
    const projectPath = dir.getPath()
    const kindByExtension = new Map([
        ['.png', 'image'],
        ['.gif', 'image'],
        ['.jpg', 'image'],
        ['.jpeg', 'image'],
        ['.bmp', 'image'],
        ['.html', 'text'],
        ['.htm', 'text'],
        ['.txt', 'text'],
        ['.i.html', 'html'],
        ['.i.htm', 'html'],
        ['.webloc', 'link'],
        ['.url', 'link'],
    ])
    const ignoredExts = new Set([
        'png', 'gif', 'jpg', 'jpeg', 'bmp',
        'zip', 'gz', '7z', 'bz2', 'apk', 'deb', 'dmg', 'iso', 'jar', 'rar', 'tar', 'bin', 'cab',
        'db', 'sqlite', 'pdf', 'psd', 'cdr',
        'woff', 'eot', 'ttf', 'otf',
    ].map(ext => `.${ext}`))
    const assetsPath = path.join(projectPath, '.code-annotations')
    const namesPath = path.join(assetsPath, '.names.cson')
    return new Promise((resolve, reject) => {
        cson.readFile(namesPath, async (error, names) => {
            if (error) {
                reject(error)
            }

            for (const [name, filename] of Object.entries(names)) {
                const filePath = path.join(assetsPath, filename)
                const kind = kindByExtension.get(path.extname(filename))
                let content
                if (kind === 'image') {
                    content = await readFileBase64(filePath)
                }
                else {
                    content = await fs.readFile(filePath, 'utf8')
                }
                names[name] = {
                    content,
                    kind,
                }
            }

            const hasGit = await (
                new Directory(path.join(projectPath, '.git'))
                .exists()
            )
            let projectFilePaths = []
            if (hasGit) {
                projectFilePaths = (
                    (await runCommand(`cd '${projectPath}' && git ls-files --full-name`))
                    .trim()
                    .split(/\r\n?|\n/)
                    .map(filePath => path.join(projectPath, filePath))
                )
            }
            else {
                projectFilePaths = await (
                    FileHound.create()
                    .path(projectPath)
                    .discard(['node_modules', '.DS_Store'])
                    .find()
                )
            }
            projectFilePaths = (
                projectFilePaths
                .filter(filePath => !ignoredExts.has(path.extname(filePath)))
            )

            const fileContents = await Promise.all(
                projectFilePaths
                .map(filePath => {
                    return fs.readFile(filePath, 'utf8')
                })
            )
            const annotations = {}
            const eolRegex = new RegExp(os.EOL, 'g')
            // Concatenation to avoid finding this file itself.
            const needle = ' CODE-' + 'ANNOTATION: '
            for (const [index, fileContent] of Object.entries(fileContents)) {
                const foundAnnotations = []
                const lines = fileContent.split(eolRegex)
                let matchedLineNumbers = []
                for (const [lineNumberStr, line] of Object.entries(lines)) {
                    const lineNumber = parseInt(lineNumberStr, 10)
                    const pos = line.indexOf(needle)
                    if (pos >= 0) {
                        const name = line.slice(pos + needle.length)
                        foundAnnotations.push({
                            lineNumber: lineNumber + 1,
                            title: name,
                            ...names[name]
                        })
                        matchedLineNumbers.push(lineNumber)
                    }
                }
                if (foundAnnotations.length > 0) {
                    matchedLineNumbers = new Set(matchedLineNumbers)
                    const relativeFilePath = path.relative(
                        projectPath,
                        projectFilePaths[index],
                    )
                    annotations[relativeFilePath] = foundAnnotations
                    try {
                        await fs.writeFile(
                            path.join(projectPath, relativeFilePath),
                            (
                                lines
                                .filter((line, index) =>
                                    !matchedLineNumbers.has(index)
                                )
                                .join(os.EOL)
                            )
                        )
                    }
                    catch (error) {
                        reject(new Error(`Could not remove old annotations from '${path.join(
                            projectPath,
                            relativeFilePath
                        )}'.`))
                    }
                    projectFilePaths[index]
                }
            }
            // CODE-ANNOTATION: test
            // CODE-ANNOTATION: test image

            try {
                await new Promise((resolve, reject) => {
                    const filePath = path.join(projectPath, '.annotations.cson')
                    cson.writeFile(
                        filePath,
                        annotations,
                        {flag: 'wx'},
                        error => {
                            if (error) {
                                reject(error)
                            }
                            else {
                                resolve()
                            }
                        }
                    )
                })
            }
            catch (error) {
                reject(new Error(
                    `Could not create '.annotations.cson'. `
                    + `Maybe it already exists.`
                ))
            }

            try {
                await fs.remove(assetsPath)
            }
            catch (error) {
                reject(new Error(`Could not delete '${assetsPath}'.`))
            }

            resolve(annotations)
        })
    })
}

const runCommand = (cmd, args) => {
    return new Promise((resolve, reject) => {
        const {exec} = require('child_process')
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error)
            }
            else {
                resolve(stdout)
            }
        })
    })
}
