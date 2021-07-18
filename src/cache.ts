// TODO: Change to MIT License
import * as vscode from 'vscode';

export interface ModelCache<T> {
    get(document: vscode.TextDocument): T | undefined;
    getFromUri(uri: vscode.Uri): Promise<T | undefined>;
    getDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined>;
    onRemoved(uri: vscode.Uri): void;
    dispose(): void;
}

export function getLanguageModelCache<T>(maxEntries: number, cleanupIntervalTimeInSec: number, parse: (document: vscode.TextDocument) => T): ModelCache<T> {
    let models: { [uriPath: string]: { version: number, languageId: string, cTime: number, model: T } } = {};
    let nModels = 0;

    let cleanupTimer: NodeJS.Timer | undefined = undefined;
    if (cleanupIntervalTimeInSec > 0) {
        cleanupTimer = setInterval(() => {
            const expireTime = Date.now() - cleanupIntervalTimeInSec * 1000;
            const uris = Object.keys(models);
            for (const uri of uris) {
                const modelInfo = models[uri];
                if (modelInfo.cTime < expireTime) {
                    delete models[uri];
                    nModels--;
                }
            }
        }, cleanupIntervalTimeInSec * 1000);
    }

    return {
        get(document: vscode.TextDocument): T | undefined {
            const version = document.version;
            const languageId = document.languageId;
            const modelInfo = models[document.uri.path];
            if (modelInfo && modelInfo.version === version && modelInfo.languageId === languageId) {
                modelInfo.cTime = Date.now();
                return modelInfo.model;
            }
            const model = parse(document);
            models[document.uri.path] = { model, version, languageId, cTime: Date.now() };
            if (!modelInfo) {
                nModels++;
            }

            if (nModels === maxEntries) {
                let oldestTime = Number.MAX_VALUE;
                let oldestUri = null;
                for (const uri in models) {
                    const modelInfo = models[uri];
                    if (modelInfo.cTime < oldestTime) {
                        oldestUri = uri;
                        oldestTime = modelInfo.cTime;
                    }
                }
                if (oldestUri) {
                    delete models[oldestUri];
                    nModels--;
                }
            }
            return model;

        },
        async getFromUri(uri: vscode.Uri): Promise<T | undefined> {
            let doc = await this.getDocument(uri);
            if (doc) {
                return this.get(doc);
            } else {
                return undefined;
            }
        },
        async getDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
            let doc = await vscode.workspace.openTextDocument(uri).then(doc => doc);
            return doc;
        },
        onRemoved(uri: vscode.Uri) {
            if (models[uri.path]) {
                delete models[uri.path];
                nModels--;
            }
        },
        dispose() {
            if (typeof cleanupTimer !== 'undefined') {
                clearInterval(cleanupTimer);
                cleanupTimer = undefined;
                models = {};
                nModels = 0;
            }
        }
    };
}
