'use babel'

import path from 'path'
import fs from 'fs-extra'
import {Directory} from 'atom'
import cson from 'season'
import FileHound from 'filehound'

import {transaction, register} from 'transactions'

import {filterAsync, readFileBase64} from './utils'


// CODE-ANNOTATION: test
// CODE-ANNOTATION: test image


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
        atom.notifications.addError(error.message, {dismissable: true})
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
    const assetsPath = path.join(projectPath, '.code-annotations')
    const namesPath = path.join(assetsPath, '.names.cson')

    const context = {}
    const fillContext = async () => {
        const names = await readCson(namesPath)
        for (const [name, filename] of Object.entries(names)) {
            const filePath = path.join(assetsPath, filename)
            const type = typeByExtension.get(path.extname(filename))
            let content
            if (type === 'image') {
                content = await readFileBase64(filePath)
            }
            else {
                content = await fs.readFile(filePath, 'utf8')
            }
            names[name] = {
                content,
                type,
            }
        }
        const projectFilePaths = await getProjectFiles(projectPath)
        const fileContents = await Promise.all(
            projectFilePaths
            .map(filePath => {
                return fs.readFile(filePath, 'utf8')
            })
        )
        const annotations = findAnnotations(
            projectPath,
            projectFilePaths,
            names,
            fileContents,
        )
        Object.assign(context, {
            annotations,
        })
    }
    const removeAnnotations = () => {
        const entries = Object.entries(context.annotations)
        return Promise.all(entries.map(([relativeFilePath, fileAnnotations]) => {
            const {_meta: {lines, fileContent}} = fileAnnotations[0]
            const matchedLineNumbers = new Set(
                fileAnnotations.map(annotation => annotation._meta.lineNumber)
            )
            const eol = detectLineBreaksKind(fileContent)
            return fs.writeFile(
                path.join(projectPath, relativeFilePath),
                (
                    lines
                    .filter((line, index) =>
                        !matchedLineNumbers.has(index)
                    )
                    .join(eol)
                )
            )
        }))
    }
    const restoreFileContents = () => {
        const entries = Object.entries(context.annotations)
        return Promise.all(entries.map(([relativeFilePath, fileAnnotations]) => {
            const {_meta: {fileContent}} = fileAnnotations[0]
            return fs.writeFile(
                path.join(projectPath, relativeFilePath),
                fileContent
            )
        }))
    }
    const createDbFile = () => {
        const filePath = path.join(projectPath, '.annotations.cson')
        const annotations = {}
        for (const [relativeFilePath, annotationsWithMeta] of Object.entries(context.annotations)) {
            annotations[relativeFilePath] = annotationsWithMeta.map(({_meta, ...props}) => {
                return props
            })
        }
        return writeCson(filePath, annotations, {flag: 'wx'})
    }
    const removeDbFile = () => {
        return fs.remove(path.join(projectPath, '.annotations.cson'))
    }
    const removeAssetsDirectory = () => fs.remove(assetsPath)
    const restoreAssetsDirectory = () => fs.ensureDir(assetsPath)
    register(fillContext, noop)
    register(removeAnnotations, restoreFileContents)
    register(createDbFile, removeDbFile)
    register(removeAssetsDirectory, restoreAssetsDirectory)
    try {
        const result = await transaction(
            fillContext,
            removeAnnotations,
            createDbFile,
            removeAssetsDirectory,
        )
        if (result instanceof Error) {
            throw result
        }
        else {
            return result
        }
    }
    catch (error) {
        console.error(error)
        throw new Error(
            `The migration of '${dir.getPath()}' has failed in an unexpected way. `
            + `This means the current file-system state is probably corrupt. `
            + `You should go back to a previous version and create an issue! `
            + `Original error message: ${error.message}`
        )
    }
}

const typeByExtension = new Map([
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

const readCson = filePath => {
    return new Promise((resolve, reject) => {
        cson.readFile(filePath, (error, names) => {
            if (error) {
                reject(error)
            }
            else {
                resolve(names)
            }
        })
    })
}

const writeCson = (filePath, data, options) => {
    return new Promise((resolve, reject) => {
        cson.writeFile(
            filePath,
            data,
            options,
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

const noop = () => {}

const getProjectFiles = async projectPath => {
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
    // Ignore binary files.
    projectFilePaths = projectFilePaths.filter(filePath =>
        !ignoredExts.has(path.extname(filePath))
    )
    // `git ls-files` may contain files that don't exist anymore. Drop those.
    if (hasGit) {
        projectFilePaths = await filterAsync(
            projectFilePaths,
            filePath => fs.exists(filePath),
        )
    }
    return projectFilePaths
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

const findAnnotations = (projectPath, projectFilePaths, names, fileContents) => {
    const annotations = {}
    const eolRegex = /\r\n?|\n/
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
                    ...names[name],
                    _meta: {
                        lineNumber,
                        lines,
                        fileContent,
                    },
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
        }
    }
    return annotations
}

const detectLineBreaksKind = text => {
    const result = text.match(/\r\n|\r|\n/)
    return result ? result[0] : null
}
