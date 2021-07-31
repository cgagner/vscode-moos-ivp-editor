// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { subscribeToDocumentChanges } from './diagnostics';
import { MoosDocument } from './parser';

class MoosHoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
		let targetWord = MoosDocument.getWordAt(document, position);
		if (!targetWord) {
			return null;
		}

		if (targetWord.startsWith("${")) {
			// Environment variable
			if (targetWord.endsWith("}")) {
				let envStr = targetWord.substring(2, targetWord.length - 1);
				if (envStr) {
					let envVar = process.env[envStr];
					if (envVar) {
						return new vscode.Hover('```' + envStr + '=' + envVar + '```');
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
		let targetWord = MoosDocument.getWordAt(document, position);

		if (!targetWord) {
			return null;
		}

		// Ignore environment variables - These are defined outside of the MOOS scope
		if (targetWord.startsWith("${")) {
			return null;
		}

		// Check for includes
		let line = document.lineAt(position.line);
		if (line.text.startsWith("#include", line.firstNonWhitespaceCharacterIndex)) {
			let regEx = new RegExp("\\s+");
			let words = line.text.split(regEx);

			if (words.length <= 1 || words[1] !== targetWord) {
				return null;
			}

			let fileUri = MoosDocument.getIncludeUri(document, targetWord);
			if (fileUri) {
				return new vscode.Location(fileUri, new vscode.Position(0, 0));
			}
		}

		
		// Look for variables 
		const matches = targetWord.match(new RegExp("^[\\$|%]\\((?<define>[^\\)]+)\\)$"));
		if (matches && matches.groups) {
			const variable = matches.groups["define"];
			if (variable) {
				console.log("Looking for variable: " + variable);
				return MoosDocument.getDefineLocation(variable, document, position);
			}
		}

		return null;
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	//const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable'];
	//const tokenModifiers = ['declaration', 'documentation'];
	//const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
	//const tokensBuilder = new vscode.SemanticTokensBuilder(legend);

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
