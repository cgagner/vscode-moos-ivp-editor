import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	PublishDiagnosticsParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	TextDocumentContentChangeEvent,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { Range } from 'vscode';

import { MoosLanguageServer } from '../../ext/moos-language-server/pkg';

// Connection to the client
const connection = createConnection(ProposedFeatures.all);

const sendDiagnosticsCallback = (params: PublishDiagnosticsParams) =>
	connection.sendDiagnostics(params);


const languageServer = new MoosLanguageServer(sendDiagnosticsCallback);
connection.onNotification((...args) => languageServer.onNotification(...args));

// Document
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	connection.console.log("Server::onInitialize");
	console.log('Server::onInitialized');
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			// Text document sync
			// TODO: this should get changed to incremental
			textDocumentSync: TextDocumentSyncKind.Full,
			// Code Completion
			completionProvider: {
				resolveProvider: false
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});


connection.onInitialized(() => {
	connection.console.log('MOOS-IvP LSP Server started.');
});


// connection.onDidChangeConfiguration(change => {
// });

// connection.onDidChangeWatchedFiles(_change => {

// });

// connection.onCompletion(
// 	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

// });

// connection.onCompletionResolve(
// 	(item: CompletionItem): CompletionItem => {

// });


// connection.onDidChangeTextDocument(change => {
// 	change.contentChanges.forEach(c => {
// 		if (TextDocumentContentChangeEvent.isIncremental(c)) {
// 			connection.console.log('Partial changes: "' + c.text + '"');
// 			connection.console.log('Range: ' + c.range.start.line + ':' + c.range.start.character
// 				+ '-' + c.range.end.line + ':' + c.range.end.character);
// 		} else {
// 			connection.console.log('Full changes: ' + c.text);
// 		}
// 	});
// });

// documents.onDidClose(event => {
// 	connection.console.log('Closed file: ' + event.document.uri
// 		+ ' | language: ' + event.document.languageId);

// });

// documents.onDidOpen(event => {
// 	connection.console.log('Opened file: ' + event.document.uri
// 		+ ' | language: ' + event.document.languageId);
// });

// documents.onDidChangeContent((change) => {
// 	connection.console.log('Received change: ' + change.document.uri);
// });

// documents.listen(connection);
connection.console.log('Starting listening');
console.log('Starting listening');
connection.listen();
