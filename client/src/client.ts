import * as vscode from 'vscode';
import * as path from 'path';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

const moosFileExtensionPatterns = [
	'**/*.moos',
	'**/*.bhv',
	'**/*.moos++',
	'**/*.bhv++',
	'**/*.meta',
	'**/*.def',
	'**/*.plug'
];


// Default client handles MOOS files that are opened without a workspace
let defaultClient: LanguageClient;
// Clients are opened for each workspace folder
let clients = new Map<string, LanguageClient>();

let _sortedWorkspaces: string[] | undefined;
function sortedWorkspaces(): string[] {
	if (_sortedWorkspaces === void 0) {
		_sortedWorkspaces = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(folder => {
			let result = folder.uri.toString();
			if (result.charAt(result.length - 1) !== '/') {
				result += '/';
			}
			return result;
		}).sort(
			(a, b) => {
				return a.localeCompare(b);
			}
		) : [];
	}
	return _sortedWorkspaces;
}
vscode.workspace.onDidChangeWorkspaceFolders(() => _sortedWorkspaces = undefined);

async function openMoosFilesInWorkspaceFolder(folder: vscode.WorkspaceFolder) {

	let uris: vscode.Uri[] = [];
	for (const pattern of moosFileExtensionPatterns) {
		let u = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern));
		// console.log('Scanning files: ' + pattern + ' ' + u.join('\n\t'));
		uris = uris.concat(u);
	}
	console.log('Scanning files: ' + uris.length);
	//return Promise.all(uris.map(openDocument));
}

async function openDocument(uri: vscode.Uri) {
	const uriMatch = (d: vscode.TextDocument) => d.uri.toString() === uri.toString();
	const doc = vscode.workspace.textDocuments.find(uriMatch);
	if (doc === undefined) { await vscode.workspace.openTextDocument(uri); }
}

function getTopWorkspace(folder: vscode.WorkspaceFolder): vscode.WorkspaceFolder {
	const sorted = sortedWorkspaces();
	for (const element of sorted) {
		let uri = folder.uri.toString();
		if (uri.charAt(uri.length - 1) !== '/') {
			uri += '/';
		}
		if (uri.startsWith(element)) {
			return vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(element))!;
		}
	}
	return folder;
}

// Extension activated
export async function activate(context: vscode.ExtensionContext) {
	console.log('MOOS Language Server extension "client" is now active!');

	const serverModule = context.asAbsolutePath(
		path.join('dist', 'server', 'server.js')
	);

	function createClient(folder: vscode.WorkspaceFolder, debugPort: number): LanguageClient {
		console.log('Starting client for: ' + folder ? folder.uri.toString() : "null");
		const debugOptions = { execArgv: ['--nolazy', `--inspect=${debugPort}`] };
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
			synchronize: {
				fileEvents: moosFileExtensionPatterns.map((pattern) => {
					return vscode.workspace.createFileSystemWatcher(pattern);
				})
			},
			workspaceFolder: folder,
		};

		return new LanguageClient(
			'moosLanguageClient',
			'MOOS-IvP LSP Client',
			serverOptions,
			clientOptions,
			true
		);
	}

	async function didOpenTextDocument(document: vscode.TextDocument) {
		if ((document.languageId !== 'moos' && document.languageId !== 'ivp-behavior')
			|| (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled')) {
			console.log('Skipping client for workspace: ' + document.languageId);
			return;
		}
		const uri = document.uri;
		if (uri.scheme === 'untitled' && !defaultClient) {

			defaultClient = createClient(null, 6009);
			defaultClient.start();
			return;
		}
		let folder = vscode.workspace.getWorkspaceFolder(uri);

		if (!folder) {
			return;
		}
		folder = getTopWorkspace(folder);

		if (!clients.has(folder.uri.toString())) {
			const client = createClient(folder, 6011 + clients.size);
			client.start();

			// TODO: This is extremely slow..
			await openMoosFilesInWorkspaceFolder(folder);

			clients.set(folder.uri.toString(), client);
		}
	}

	vscode.workspace.onDidOpenTextDocument(didOpenTextDocument);
	vscode.workspace.textDocuments.forEach(didOpenTextDocument);
	vscode.workspace.onDidChangeWorkspaceFolders((event) => {
		for (const folder of event.removed) {
			const client = clients.get(folder.uri.toString());
			if (client) {
				clients.delete(folder.uri.toString());
				client.stop();
			}
		}
	});
}

// Extension deactivated - Stop all of the clients
export function deactivate(): Thenable<void> {
	const promises: Thenable<void>[] = [];
	if (defaultClient) {
		promises.push(defaultClient.stop());
	}
	for (const client of clients.values()) {
		if (client) {
			promises.push(client.stop());
		}
	}
	return Promise.all(promises).then(() => undefined);
}
