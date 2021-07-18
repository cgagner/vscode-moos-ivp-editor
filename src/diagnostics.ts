import * as vscode from 'vscode';
import { MoosDocument } from './parser';

/** Code that is used to associate diagnostic entries with code actions. */
export const MOOS_MENTION = 'MOOS';

/** String to detect in the text document. */
const EMOJI = 'moos';

/**
 * Analyzes the text document for problems. 
 * This demo diagnostic problem provider finds all mentions of 'emoji'.
 * @param doc text document to analyze
 * @param moosDiagnostics diagnostic collection
 */
export function refreshDiagnostics(doc: vscode.TextDocument, moosDiagnostics: vscode.DiagnosticCollection): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
        const lineOfText = doc.lineAt(lineIndex);

        if (lineOfText.text.startsWith("#include", lineOfText.firstNonWhitespaceCharacterIndex)) {
            let diag = createDiagnostic(doc, lineOfText, lineIndex);
            if (diag) {
                diagnostics.push(diag);
            }
        }
    }

    moosDiagnostics.set(doc.uri, diagnostics);
}

function createDiagnostic(doc: vscode.TextDocument, lineOfText: vscode.TextLine, lineIndex: number): vscode.Diagnostic | null {

    let line = lineOfText.text;
    if (line.includes("//")) {
        line = line.substring(0, line.search("\\s*//"));
    }
    line = line.trim();

    if (line.startsWith("#include")) {
        const index = lineOfText.firstNonWhitespaceCharacterIndex;
        const end_index = lineOfText.text.includes("//") ? lineOfText.text.search("\\s*//") : lineOfText.text.length;

        // create range that represents, where in the document the word is
        const range = new vscode.Range(lineIndex, index, lineIndex, end_index);

        let matches = line.match("^\\s*#include\\s*(?<include_str>\"[^\"]*\"|[^\\s]+)(?<extra_str>.*)$");

        if (matches && matches.groups &&
            !matches.groups["extra_str"] &&
            matches.groups["include_str"] &&
            matches.groups["include_str"] != "\"\"") {

            let include_uri = MoosDocument.getIncludeUri(doc, matches.groups["include_str"]);
            if (include_uri) {
                return null;
            }
            const diagnostic = new vscode.Diagnostic(range, "Include file not found in browse.path.",
                vscode.DiagnosticSeverity.Information);

            diagnostic.code = MOOS_MENTION;
            return diagnostic;
        }

        const diagnostic = new vscode.Diagnostic(range, "Invalid number of arguments for include macro.",
            vscode.DiagnosticSeverity.Error);

        diagnostic.code = MOOS_MENTION;
        
        // NOTE: This is what we need to do for code that is ignored by ifdef
        // diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        return diagnostic;

    }


    return null;
}

export function subscribeToDocumentChanges(context: vscode.ExtensionContext, moosDiagnostics: vscode.DiagnosticCollection): void {
    if (vscode.window.activeTextEditor) {
        refreshDiagnostics(vscode.window.activeTextEditor.document, moosDiagnostics);
    }
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                refreshDiagnostics(editor.document, moosDiagnostics);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, moosDiagnostics))
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => moosDiagnostics.delete(doc.uri))
    );

}