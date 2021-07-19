import * as vscode from 'vscode';
import * as path from 'path';

const fs = require('fs');

// TODO:
// * Parser class
// * Handler interface
// * Cache class
// 

// Document Type: MOOS, Behavior, Def
// * MOOS
//   * Global Variables
//   * Antler Block
//   * Application Block
// * Behavior
//   * Initialize
//   * Hierarchical Mode Declarations
//   * Behavior Block
// * Def

// Diagnostics
// Semantic Tokens
// 

class Node {

}

interface Parser {
    parse(document: vscode.TextDocument): Node;
}

enum MacroMode {
    top,
    ifDefFailed,
    ifDefPassed,
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
        if (this.stack.length === 0) {
            return MacroMode.top;
        } else {
            return this.stack[this.stack.length - 1];
        }
    }

    skipLines(): boolean {
        if (this.stack.includes(MacroMode.ifDefFailed)) {
            return false;
        }
        return false;
    }
}

class MoosDefinition {

}

export class MoosDocument {
    scanTime: Number;

    constructor(filePath: string) {
        this.scanTime = 0;

        if (fs.existsSync(filePath)) {
            console.log('File Path: ' + filePath);
            let stats = fs.statSync(filePath);
            console.log('Modified time: ' + stats.mtime);

        }
    }

    /**
     * Remove comments on the specified line.
     * @param line Line to remove a comment
     * @returns Line with comments removed
     */
    static removeComments(line: string): string {
        // Make sure not to remove // that are inside of quotes
        const commentIndex = this.getCommentIndex(line);
        if (commentIndex >= 0) {
            return line.substring(0, commentIndex);
        }
        return line;
    }

    /**
     * Get the index of a comment in a line or `-1` if the line does
     * not contain a comment.
     * @param line Line to check for a comment
     * @returns Index of a comment in a line or `-1` if the line does
     * not contain a comment
     */
    static getCommentIndex(line: string): number {
        // Make sure not to remove // that are inside of quotes
        let matches = line.matchAll(new RegExp("(((?:\"[^\"]*\")|(?<comment>\\s*//.*)))", "g"));
        for (const match of matches) {
            const comment = match.groups ? match.groups["comment"] : undefined;
            if (comment) {
                return line.lastIndexOf(comment);
            }
        }
        return -1;
    }

    /**
     * Check if a line has a comment
     * @param line Line to check for a comment
     * @returns true if the line has a comment in it
     */
    static hasComments(line: string): boolean {
        return this.getCommentIndex(line) >= 0;
    }

    static getWordAt(document: vscode.TextDocument, position: vscode.Position): string {
        if (document.lineCount < position.line) {
            return "";
        }

        // Remove comments and trim whitespace
        const lineOfText = document.lineAt(position.line);
        const commentIndex = MoosDocument.getCommentIndex(lineOfText.text);
        const containsComment = commentIndex >= 0;
        const endIndex = containsComment ? commentIndex : lineOfText.text.length;
        const line = lineOfText.text.substring(0, endIndex).trim();

        // Ignore empty lines and lines that start with a comment
        if (line.length === 0) {
            return "";
        }

        let range = document.getWordRangeAtPosition(position, new RegExp('[^\\s]+'));
        if (range === undefined) {
            return "";
        }

        // Ignore target words that are in comment
        if (containsComment && commentIndex < range.start.character) {
            return "";
        }

        // Update the range to end at the start of a comment if there is a comment
        // This is an edge case where there isn't a space between a comment and 
        // another word. E.G.:
        // ```
        // $(VNAME)// Vehicle Name
        // ```
        // This should return "$(VNAME)" as the word and remove the comment
        range = new vscode.Range(range.start.line, range.start.character, range.end.line, 
            Math.min(range.end.character, containsComment ? commentIndex : range.end.character));

        let targetWord = document.getText(range);

        // Ignore # macros
        if (targetWord.startsWith("#")) {
            return "";
        }

        return targetWord;
    }

    static getIncludeUri(document: vscode.TextDocument, filename: string): vscode.Uri | undefined {

        let documentDir = path.dirname(document.uri.path);

        let name = filename.trim();
        if (name.startsWith("\"") && name.endsWith("\"")) {
            name = name.substring(1, name.length - 1);
        }

        let includePath = path.join(documentDir, name);

        // TODO: Search the wordspace and the include path specified in the settings

        try {
            if (fs.existsSync(includePath)) {
                console.log('File Path: ' + includePath);
                let stats = fs.statSync(includePath);
                console.log('Modified time: ' + stats.mtime);
                return vscode.Uri.file(includePath);
            }
        } catch (err) {
            return undefined;
        }

        return undefined;
    }

    static async openDocument(fileUri: vscode.Uri) {
        try {
            return await vscode.workspace.openTextDocument(fileUri);
        } catch (err) {
            return undefined;
        }
    }

    static getDefineLocation(variable: string, document: vscode.TextDocument, position?: vscode.Position, variables?: Map<string, vscode.Location>): vscode.Location | undefined {
        if (!variable) {
            return undefined;
        }

        let endLine = (position ? position.line : document.lineCount);

        if (!variables) {
            variables = new Map<string, vscode.Location>();
        }


        const lineCount = document.lineCount;
        for (let i = 0; i < endLine; ++i) {
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
            if (words[0] === "#ifdef") {
            } else if (words[0] === "#elseifdef") {
            } else if (words[0] === "#else") {
            } else if (words[0] === "#ifndef") {
            } else if (words[0] === "#include") {
                let includeUri = MoosDocument.getIncludeUri(document, words[1]);
                if (includeUri) {
                    console.log('Scanning include file: ' + includeUri);
                    let found = false;

                    vscode.workspace.openTextDocument(includeUri).then(doc => {
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
            else if (words[0] === "#define") {
                if (words[1] === variable) {
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
