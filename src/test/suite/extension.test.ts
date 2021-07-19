import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { MoosDocument } from '../../parser';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual("#include \"test // test \"", MoosDocument.removeComments("#include \"test // test \" // test"));
		assert.strictEqual("#include \"test // test \" \"test // test \"", MoosDocument.removeComments("#include \"test // test \" \"test // test \" // test"));
		assert.strictEqual("", MoosDocument.removeComments("// #include \"test // test \" \"test // test \" // test"));
		assert.strictEqual("", MoosDocument.removeComments("    // #include \"test // test \" \"test // test \" // test"));
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
