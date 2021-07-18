import * as vscode from 'vscode';
import * as path from 'path';

const fs = require('fs')

enum MacroMode {
    Top,
    IfDefFailed,
    IfDefPassed,
}

class MacroStack {

    stack: MacroMode[];

    constructor() {
        this.stack = [];
    }


    push(mode: MacroMode) {
        this.stack.push(mode);
    }

    pop(): MacroMode | undefined {
        return this.stack.pop();
    }

    current(): MacroMode {
        if (this.stack.length == 0) {
            return MacroMode.Top;
        } else {
            return this.stack[this.stack.length - 1];
        }
    }

    skipLines(): boolean {
        if (this.stack.includes(MacroMode.IfDefFailed)) {
            return false;
        }
        return false;
    }
}

class MoosDefinition {

}

export class MoosDocument {
    scan_time: Number;

    constructor(file_path: string) {
        this.scan_time = 0;

        if (fs.existsSync(file_path)) {
            console.log('File Path: ' + file_path);
            let stats = fs.statSync(file_path);
            console.log('Modified time: ' + stats.mtime);

        }
    }

    static getWordAt(document: vscode.TextDocument, position: vscode.Position): string {
        if (document.lineCount < position.line) {
            return "";
        }

        let line = document.lineAt(position.line);

        // Ignore empty lines and lines that start with a comment
        if (line.isEmptyOrWhitespace || line.text.startsWith("//", line.firstNonWhitespaceCharacterIndex)) {
            return "";
        }

        let range = document.getWordRangeAtPosition(position, new RegExp('[^\\s]+'));
        if (range == null) {
            return "";
        }

        let line_beginning = line.text.substring(0, range.start.character);

        // Ignore target words that are in comment
        if (line_beginning.includes("//")) {
            return "";
        }

        let target_word = document.getText(range);

        // Ignore # macros - also catch edge cases where the target workd starts with a comment
        if (target_word.startsWith("#") || target_word.startsWith("//")) {
            return "";
        }

        return target_word;
    }

    static getIncludeUri(document: vscode.TextDocument, file_name: string): vscode.Uri | undefined {

        let document_dir = path.dirname(document.uri.path);

        let name = file_name.trim();
        if (name.startsWith("\"") && name.endsWith("\"")) {
            name = name.substring(1, name.length - 1);
        }

        let include_path = path.join(document_dir, name);

        // TODO: Search the wordspace and the include path specified in the settings

        try {
            if (fs.existsSync(include_path)) {
                console.log('File Path: ' + include_path);
                let stats = fs.statSync(include_path);
                console.log('Modified time: ' + stats.mtime);
                return vscode.Uri.file(include_path);
            }
        } catch (err) {
            return undefined;
        }

        return undefined;
    }

    static async openDocument(file_uri: vscode.Uri) {
        try {
            return await vscode.workspace.openTextDocument(file_uri);
        } catch (err) {
            return undefined;
        }
    }

    static getDefineLocation(variable: string, document: vscode.TextDocument, position?: vscode.Position, variables?: Map<string, vscode.Location>): vscode.Location | undefined {
        if (!variable) {
            return undefined;
        }

        let end_line = (position ? position.line : document.lineCount);

        if (!variables) {
            variables = new Map<string, vscode.Location>();
        }


        let line_count = document.lineCount;
        for (let i = 0; i < end_line; ++i) {
            let line = document.lineAt(i);
            if (!line.text.startsWith("#", line.firstNonWhitespaceCharacterIndex)) {
                continue;
            }

            let regEx = new RegExp("\\s+");
            let words = line.text.split(regEx);

            if (words.length <= 1) {
                continue;
            }


            let stack = new MacroStack();

            // ifdef
            if (words[0] == "#ifdef") {
            } else if (words[0] == "#elseifdef") {
            } else if (words[0] == "#else") {
            } else if (words[0] == "#ifndef") {
            } else if (words[0] == "#include") {
                let include_uri = MoosDocument.getIncludeUri(document, words[1]);
                if (include_uri) {
                    console.log('Scanning include file: ' + include_uri);
                    let found = false;

                    vscode.workspace.openTextDocument(include_uri).then(doc => {
                        console.log('Opened document: ' + doc.lineCount);
                        let result = this.getDefineLocation(variable, doc, undefined, variables);
                        if (result) {
                            console.log("Found definition: " + result.uri);
                            variables?.set(variable, result);
                            found = true;
                        }
                    });
                    console.log("Checking if found");
                    if (found) {
                        console.log("Found2 definition: " + variables.get(variable)?.uri);
                        return variables.get(variable);
                    }
                }
            }
            else if (words[0] == "#define") {
                if (words[1] == variable) {
                    console.log("Found a define: " + words[1]);
                    return new vscode.Location(document.uri, new vscode.Position(i, 0));
                } else {
                    variables.set(words[1], new vscode.Location(document.uri, new vscode.Position(0, 0)));
                }
            }

        }


        return undefined;
    }
}
