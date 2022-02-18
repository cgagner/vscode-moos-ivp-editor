// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "client" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('client.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Client LSP Running!');
	// });

	// context.subscriptions.push(disposable);

	let folders = vscode.workspace.workspaceFolders || [];

	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('dist', 'server', 'server.js')
	);

	// Debug options
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'moos' },
			{ scheme: 'file', language: 'ivp-behavior' }
		],
		// workspaceFolder: folder,
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher('**/.moos'),
				vscode.workspace.createFileSystemWatcher('**/.bhv'),
				vscode.workspace.createFileSystemWatcher('**/.meta'),
				vscode.workspace.createFileSystemWatcher('**/.def'),
				vscode.workspace.createFileSystemWatcher('**/.plug'),
			]
		}
	};


	client = new LanguageClient(
		'moosLanguageClient',
		'MOOS-IvP LSP Client',
		serverOptions,
		clientOptions,
		true
	);

	client.onReady().then(() => {
		console.log('Client ready');
	});



	// Starting the client will also start the server
	client.start();

	console.log('Client started');
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (!client) {
		return undefined;
	}
	return client.stop();

}
