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
	InitializeResult,
	SemanticTokens,
	SemanticTokensOptions,
	SemanticTokensRegistrationOptions,
	SemanticTokensRequest,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import { languages, Range, SemanticTokensLegend } from 'vscode';

import { MoosLanguageServer } from '../../ext/moos-language-server/pkg';
import { resolveModulePath } from 'vscode-languageserver/lib/node/files';

// TODO: Benchmark
import { performance } from 'perf_hooks';

// Connection to the client
const connection = createConnection(ProposedFeatures.all);

const sendDiagnosticsCallback = (params: PublishDiagnosticsParams) =>
	connection.sendDiagnostics(params);


const languageServer = new MoosLanguageServer(sendDiagnosticsCallback);
connection.onNotification((...args) => {
	// TODO: Need to remove this benchmarking
	var startTime = performance.now();
	let result = languageServer.onNotification(...args);
	var endTime = performance.now();
	console.log(`onNotification took ${endTime - startTime} milliseconds`);
	return result;
});
//connection.onRequest((...args) => languageServer.onRequest(...args));

connection.onRequest(SemanticTokensRequest.type, (params) => languageServer.onSemanticTokensFull(params));




// Document
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	connection.console.log("Server::onInitialize");
	let capabilities = params.capabilities;
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
			textDocumentSync: {
				openClose: true,
				save: false,
				change: TextDocumentSyncKind.Full,
			},
                       // TODO: Uncomment when code completion is working
			// Code Completion
			// completionProvider: {
			// 	resolveProvider: true
			// }
		}
	};
        // TODO: Need to get these from the Rust code
	const tokenTypes = ['comment', 'keyword', 'class', 'interface', 'enum', 'function', 'variable'];
	const tokenModifiers = ['declaration', 'documentation'];
	result.capabilities.semanticTokensProvider = {
		legend: {
			tokenTypes: tokenTypes,
			tokenModifiers: tokenModifiers
		},
		full: true,
	};

	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
			},
			// fileOperations: {
			// }
		};
	}
	return result;
});


connection.onInitialized(() => {
	connection.console.log('MOOS-IvP LSP Server started.');
});

connection.console.log('Starting listening');
connection.listen();
