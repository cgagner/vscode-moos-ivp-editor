# MOOS-IvP Editor for VS Code

The MOOS-IvP Editor extension for Visual Studio Code adds syntax highlighting for MOOS
mission files, IvP behaviors files, and NSPlug files. Syntax highlighting
has limited error detection. Semantic highlighting may be added in the 
future.

## Features

### MOOS Mission Files

* Syntax Highlighting
  * Global variables
  * `pAntler` block
  * Generalized application block

![MOOS Mission File](https://raw.githubusercontent.com/cgagner/vscode-moos-ivp-editor/main/images/example_mission.png)

### IvP Behavior Files

* Syntax Highlighting
  * Initialize statements
  * Set statements
  * Behavior blocks - Highlights inherited options

![IvP Behavior File](https://raw.githubusercontent.com/cgagner/vscode-moos-ivp-editor/main/images/example_behavior.png)

### pAntler Options

For more information on the `pAntler` options, see: 
https://oceanai.mit.edu/ivpman/pmwiki/pmwiki.php?n=IvPTools.PAntler

## Requirements

This extension requires Visual Studio Code `1.32` or later. It is also
recommended that MOOS-IvP be installed on the system. The 
[Remote SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
extension by Microsoft is also recommended in order to edit MOOS mission files
and IvP behavior files that are located on a remote system such as a vehicle
or robot.

## Extension Settings

This extension currently doesn't have any settings. However, that is expected
to change in the future. This section will be updated when settings have been
added.

## Known Issues

* MOOS Syntax:
  * Need to add the ability to add options specific to individual applications
* Behavior Syntax:
  * Need to add the ability to add options specific to individual applications
  * Add support for built-in macros `uTimerScript`:
	* `$[DBTIME]`, `$[UTCTIME]`, `$[COUNT]`, `$[TCOUNT]` and `$[IDX]`
	* Add support for arithmetic
	* `$[RAND_VAL]`
	* `randvar = varname=ANG, min=0, max=359, key=at_reset`


## Release Notes

### 0.0.1

Initial release of the moos-ivp-editor extension for VS Code.

## Extension Details 

### Extension File Structure

```
.
├── .vscode
│   ├── launch.json     // Config for launching and debugging the extension
│   └── tasks.json      // Config for build task that compiles TypeScript
├── .gitignore          // Ignore build output and node_modules
├── README.md           // This file
├── client              // LSP client portion of the extension
│   └── src
│       └── extension.ts // Client extension source code
├── package.json        // Extension manifest
├── tsconfig.json       // TypeScript configuration
```

### Building Extension


#### Notes:

```bash
cargo install wasm-pack
```

## For more information

* [MOOS-IvP Homepage](https://oceanai.mit.edu/moos-ivp)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
