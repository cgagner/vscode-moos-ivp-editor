import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);

// connection.onInitialize((params: InitializeParams) => {
// });


connection.onInitialized(() => {
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

