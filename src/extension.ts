// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { fstatSync } from 'fs';
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

class MoosDocument {
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

		let include_path = path.join(document_dir, file_name);

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

	static async openDocument(file_uri: vscode.Uri)  {
		try {
			return await vscode.workspace.openTextDocument(file_uri);
		} catch(err) {
			return undefined;
		}
	}

	static getDefineLocation(variable: string, document: vscode.TextDocument, position?: vscode.Position,  variables?: Map<string, vscode.Location>): vscode.Location | undefined {
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
				if(include_uri) {
					console.log('Scanning include file: ' + include_uri);
					let found = false;
					
					vscode.workspace.openTextDocument(include_uri).then(doc => {
						console.log('Opened document: ' + doc.lineCount);
						let result = this.getDefineLocation(variable, doc, undefined, variables);
						if(result) {
							console.log("Found definition: " + result.uri);
							variables?.set(variable, result);
							found = true;
						}
					});
					console.log("Checking if found");
					if(found) {
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

class MoosHoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
		let target_word = MoosDocument.getWordAt(document, position);
		if (!target_word) {
			return null;
		}

		if (target_word.startsWith("${")) {
			// Environment variable
			if (target_word.endsWith("}")) {
				let env_str = target_word.substring(2, target_word.length - 1);
				if (env_str) {
					let env_var = process.env[env_str];
					if (env_var) {
						return new vscode.Hover('```' + env_str + '=' + env_var + '```');
					}
				}
			}
			return null;
		}
		return null;
	}

}

class MoosDefinitionProvider implements vscode.DefinitionProvider {

	provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
		let target_word = MoosDocument.getWordAt(document, position);

		if (!target_word) {
			return null;
		}

		// Ignore environment variables - These are defined outside of the MOOS scope
		if (target_word.startsWith("${")) {
			return null;
		}

		// Check for includes
		let line = document.lineAt(position.line);
		if (line.text.startsWith("#include", line.firstNonWhitespaceCharacterIndex)) {
			let regEx = new RegExp("\\s+");
			let words = line.text.split(regEx);

			if (words.length <= 1 || words[1] != target_word) {
				return null;
			}

			let file_uri = MoosDocument.getIncludeUri(document, target_word);
			if (file_uri) {
				return new vscode.Location(file_uri, new vscode.Position(0, 0));
			}
		}

		// Check for Variables that start with $
		if (target_word.startsWith("$", line.firstNonWhitespaceCharacterIndex)) {
			// Look for variables 
			let matches = target_word.match(new RegExp("^\\$(?<define>\\([^\\)]+\\)|\\w+)$"));
			if (matches?.groups) {
				let variable = matches.groups["define"];
				if (variable) {
					if (variable.startsWith('(') && variable.endsWith(')')) {
						variable = variable.substring(1, variable.length - 1);
					}
					console.log("Looking for variable: " + variable);
					return MoosDocument.getDefineLocation(variable, document, position);
				}
				return null;
			}
		}

		return null;
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "moos-ivp-editor2" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('moos-ivp-editor2.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from moos-ivp-editor2!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'moos' }, new MoosDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'moos' }, new MoosHoverProvider()));
}

// this method is called when your extension is deactivated
export function deactivate() { }
