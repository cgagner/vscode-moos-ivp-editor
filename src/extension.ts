// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { subscribeToDocumentChanges } from './diagnostics';
import {MoosDocument} from './parser'

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

	const diag = vscode.languages.createDiagnosticCollection("moos");
	context.subscriptions.push(diag);
	subscribeToDocumentChanges(context, diag);


	// MOOS Providers
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'moos' }, new MoosDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'moos' }, new MoosHoverProvider()));

	// IvP Providers
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'ivp-behavior' }, new MoosDefinitionProvider()));
	context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'ivp-behavior' }, new MoosHoverProvider()));
}

// this method is called when your extension is deactivated
export function deactivate() { }
