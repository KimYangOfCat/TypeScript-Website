var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs", "./vendor/ata/index"], function (require, exports, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs, index_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.filetype === "js" ? "javascript" : "typescript");
    // Basically android and monaco is pretty bad, this makes it less bad
    // See https://github.com/microsoft/pxt/pull/7099 for this, and the long
    // read is in https://github.com/microsoft/monaco-editor/issues/563
    const isAndroid = navigator && /android/i.test(navigator.userAgent);
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
        quickSuggestions: {
            other: !isAndroid,
            comments: !isAndroid,
            strings: !isAndroid,
        },
        acceptSuggestionOnCommitCharacter: !isAndroid,
        acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
        accessibilitySupport: !isAndroid ? "on" : "off",
        inlayHints: {
            enabled: true,
        },
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            filetype: "ts",
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const ext = isJSX && config.filetype !== "d.ts" ? config.filetype + "x" : config.filetype;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    const createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : (0, getInitialCode_1.getInitialCode)(config.text, document.location);
        // Defaults
        const compilerDefaults = (0, compilerOptions_1.getDefaultSandboxCompilerOptions)(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = (0, compilerOptions_1.getCompilerOptionsFromParams)(compilerDefaults, ts, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        const isJSLang = config.filetype === "js";
        // Don't allow a state like allowJs = false
        if (isJSLang) {
            compilerOptions.allowJs = true;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = isJSLang
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = isJSLang
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        // @ts-ignore - these exist
        if (config.customTypeScriptWorkerPath && defaults.setWorkerOptions) {
            // @ts-ignore - this func must exist to have got here
            defaults.setWorkerOptions({
                customWorkerPath: config.customTypeScriptWorkerPath,
            });
        }
        defaults.setDiagnosticsOptions(Object.assign(Object.assign({}, defaults.getDiagnosticsOptions()), { noSemanticValidation: false, 
            // This is when tslib is not found
            diagnosticCodesToIgnore: [2354] }));
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, _path) => {
            const path = "file://" + _path;
            defaults.addExtraLib(code, path);
            const uri = monaco.Uri.file(path);
            if (monaco.editor.getModel(uri) === null) {
                monaco.editor.createModel(code, "javascript", uri);
            }
            config.logger.log(`[ATA] Adding ${path} to runtime`, { code });
        };
        const getTwoSlashCompilerOptions = (0, twoslashSupport_1.extractTwoSlashCompilerOptions)(ts);
        // Auto-complete twoslash comments
        if (config.supportTwoslashCompilerOptions) {
            const langs = ["javascript", "typescript"];
            langs.forEach(l => monaco.languages.registerCompletionItemProvider(l, {
                triggerCharacters: ["@", "/", "-"],
                provideCompletionItems: (0, twoslashSupport_1.twoslashCompletions)(ts, monaco),
            }));
        }
        const ata = (0, index_1.setupTypeAcquisition)({
            projectName: "TypeScript Playground",
            typescript: ts,
            logger: console,
            delegate: {
                receivedFile: addLibraryToRuntime,
                progress: (downloaded, total) => {
                    // console.log({ dl, ttl })
                },
                started: () => {
                    console.log("ATA start");
                },
                finished: f => {
                    console.log("ATA done");
                },
            },
        });
        const textUpdated = () => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashCompilerOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                ata(code);
            }
        };
        // Debounced sandbox features like twoslash and type acquisition to once every second
        let debouncingTimer = false;
        editor.onDidChangeModelContent(_e => {
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                textUpdated();
            }, 1000);
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            const newKeys = Object.keys(opts);
            if (!newKeys.length)
                return;
            // Don't update a compiler setting if it's the same
            // as the current setting
            newKeys.forEach(key => {
                if (compilerOptions[key] == opts[key])
                    delete opts[key];
            });
            if (!Object.keys(opts).length)
                return;
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, compilerOptions), opts);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            // This isn't quite _right_ in theory, we can downlevel JS -> JS
            // but a browser is basically always esnext-y and setting allowJs and
            // checkJs does not actually give the downlevel'd .js file in the output
            // later down the line.
            if (isJSLang) {
                return getText();
            }
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        const setupTSVFS = (fsMapAdditions) => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            if (fsMapAdditions) {
                fsMapAdditions.forEach((v, k) => fsMap.set(k, v));
            }
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return {
                program,
                system,
                host,
                fsMap,
            };
        });
        /**
         * Creates a TS Program, if you're doing anything complex
         * it's likely you want setupTSVFS instead and can pull program out from that
         *
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const tsvfs = yield setupTSVFS();
            return tsvfs.program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        textUpdated();
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project. As well as some of the
             * primitive objects you would normally need to do work with the files.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * Accepts an optional fsMap which you can use to add any files, or overwrite the default file.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            setupTSVFS,
            /** Uses the above call setupTSVFS, but only returns the program */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /**
             * @deprecated Use `getTwoSlashCompilerOptions` instead.
             *
             * Returns compiler options in the source code using twoslash notation
             */
            getTwoSlashComplierOptions: getTwoSlashCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashCompilerOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
            /** Adds a file to the vfs used by the editor */
            addLibraryToRuntime,
        };
    };
    exports.createTypeScriptSandbox = createTypeScriptSandbox;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQXNEQSxNQUFNLFlBQVksR0FBRyxDQUFDLE1BQXFCLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFeEcscUVBQXFFO0lBQ3JFLHdFQUF3RTtJQUN4RSxtRUFBbUU7SUFDbkUsTUFBTSxTQUFTLEdBQUcsU0FBUyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBRW5FLDZDQUE2QztJQUM3QyxNQUFNLG1CQUFtQixHQUFrRDtRQUN6RSxvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLHNCQUFzQixFQUFFLENBQUM7UUFDekIsT0FBTyxFQUFFO1lBQ1AsT0FBTyxFQUFFLEtBQUs7U0FDZjtRQUNELFNBQVMsRUFBRTtZQUNULE9BQU8sRUFBRSxJQUFJO1NBQ2Q7UUFDRCxnQkFBZ0IsRUFBRTtZQUNoQixLQUFLLEVBQUUsQ0FBQyxTQUFTO1lBQ2pCLFFBQVEsRUFBRSxDQUFDLFNBQVM7WUFDcEIsT0FBTyxFQUFFLENBQUMsU0FBUztTQUNwQjtRQUNELGlDQUFpQyxFQUFFLENBQUMsU0FBUztRQUM3Qyx1QkFBdUIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO1FBQ2xELG9CQUFvQixFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7UUFDL0MsVUFBVSxFQUFFO1lBQ1YsT0FBTyxFQUFFLElBQUk7U0FDZDtLQUNGLENBQUE7SUFFRCx5REFBeUQ7SUFDekQsU0FBZ0IseUJBQXlCO1FBQ3ZDLE1BQU0sTUFBTSxHQUFrQjtZQUM1QixJQUFJLEVBQUUsRUFBRTtZQUNSLEtBQUssRUFBRSxFQUFFO1lBQ1QsZUFBZSxFQUFFLEVBQUU7WUFDbkIsWUFBWSxFQUFFLElBQUk7WUFDbEIsUUFBUSxFQUFFLElBQUk7WUFDZCw4QkFBOEIsRUFBRSxLQUFLO1lBQ3JDLE1BQU0sRUFBRSxPQUFPO1NBQ2hCLENBQUE7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNmLENBQUM7SUFYRCw4REFXQztJQUVELFNBQVMsZUFBZSxDQUFDLE1BQXFCLEVBQUUsZUFBZ0MsRUFBRSxNQUFjO1FBQzlGLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQTtRQUM5RSxNQUFNLEdBQUcsR0FBRyxLQUFLLElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO1FBQ3pGLE9BQU8sUUFBUSxHQUFHLEdBQUcsQ0FBQTtJQUN2QixDQUFDO0lBRUQsOERBQThEO0lBQzlELFNBQVMsYUFBYSxDQUFDLE1BQXFCLEVBQUUsZUFBZ0MsRUFBRSxNQUFjO1FBQzVGLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQscUZBQXFGO0lBQzlFLE1BQU0sdUJBQXVCLEdBQUcsQ0FDckMsYUFBcUMsRUFDckMsTUFBYyxFQUNkLEVBQStCLEVBQy9CLEVBQUU7UUFDRixNQUFNLE1BQU0sbUNBQVEseUJBQXlCLEVBQUUsR0FBSyxhQUFhLENBQUUsQ0FBQTtRQUNuRSxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixJQUFJLE1BQU0sQ0FBQztZQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUE7UUFFbkUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLHVDQUF1QztZQUNoRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDYixDQUFDLENBQUMsSUFBQSwrQkFBYyxFQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxELFdBQVc7UUFDWCxNQUFNLGdCQUFnQixHQUFHLElBQUEsa0RBQWdDLEVBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXpFLCtDQUErQztRQUMvQyxJQUFJLGVBQWdDLENBQUE7UUFDcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsRUFBRTtZQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbkQsSUFBSSx5QkFBeUIsR0FBRyxJQUFBLDhDQUE0QixFQUFDLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMxRixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxNQUFNO2dCQUMvQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxxREFBcUQsRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1lBQ3JHLGVBQWUsbUNBQVEsZ0JBQWdCLEdBQUsseUJBQXlCLENBQUUsQ0FBQTtTQUN4RTthQUFNO1lBQ0wsZUFBZSxHQUFHLGdCQUFnQixDQUFBO1NBQ25DO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUE7UUFDekMsMkNBQTJDO1FBQzNDLElBQUksUUFBUSxFQUFFO1lBQ1osZUFBZSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7U0FDL0I7UUFFRCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckMsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFFLE1BQWMsQ0FBQyxlQUFlLENBQUE7UUFFM0csTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsb0JBQVksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSx3QkFBZ0IsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLENBQUMsY0FBYyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pHLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUU1RCxNQUFNLFNBQVMsR0FBRyxRQUFRO1lBQ3hCLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7WUFDakQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFBO1FBRW5ELE1BQU0sUUFBUSxHQUFHLFFBQVE7WUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLGtCQUFrQjtZQUNoRCxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUE7UUFFbEQsMkJBQTJCO1FBQzNCLElBQUksTUFBTSxDQUFDLDBCQUEwQixJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNsRSxxREFBcUQ7WUFDckQsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2dCQUN4QixnQkFBZ0IsRUFBRSxNQUFNLENBQUMsMEJBQTBCO2FBQ3BELENBQUMsQ0FBQTtTQUNIO1FBRUQsUUFBUSxDQUFDLHFCQUFxQixpQ0FDekIsUUFBUSxDQUFDLHFCQUFxQixFQUFFLEtBQ25DLG9CQUFvQixFQUFFLEtBQUs7WUFDM0Isa0NBQWtDO1lBQ2xDLHVCQUF1QixFQUFFLENBQUMsSUFBSSxDQUFDLElBQy9CLENBQUE7UUFFRixvRUFBb0U7UUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQVksRUFBRSxLQUFhLEVBQUUsRUFBRTtZQUMxRCxNQUFNLElBQUksR0FBRyxTQUFTLEdBQUcsS0FBSyxDQUFBO1lBQzlCLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2pDLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUN4QyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2FBQ25EO1lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRSxDQUFDLENBQUE7UUFFRCxNQUFNLDBCQUEwQixHQUFHLElBQUEsZ0RBQThCLEVBQUMsRUFBRSxDQUFDLENBQUE7UUFFckUsa0NBQWtDO1FBQ2xDLElBQUksTUFBTSxDQUFDLDhCQUE4QixFQUFFO1lBQ3pDLE1BQU0sS0FBSyxHQUFHLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQzFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDaEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2pELGlCQUFpQixFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ2xDLHNCQUFzQixFQUFFLElBQUEscUNBQW1CLEVBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQzthQUN4RCxDQUFDLENBQ0gsQ0FBQTtTQUNGO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBQSw0QkFBb0IsRUFBQztZQUMvQixXQUFXLEVBQUUsdUJBQXVCO1lBQ3BDLFVBQVUsRUFBRSxFQUFFO1lBQ2QsTUFBTSxFQUFFLE9BQU87WUFDZixRQUFRLEVBQUU7Z0JBQ1IsWUFBWSxFQUFFLG1CQUFtQjtnQkFDakMsUUFBUSxFQUFFLENBQUMsVUFBa0IsRUFBRSxLQUFhLEVBQUUsRUFBRTtvQkFDOUMsMkJBQTJCO2dCQUM3QixDQUFDO2dCQUNELE9BQU8sRUFBRSxHQUFHLEVBQUU7b0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztnQkFDRCxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUU7b0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDekIsQ0FBQzthQUNGO1NBQ0YsQ0FBQyxDQUFBO1FBRUYsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO1lBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUUxQyxJQUFJLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRTtnQkFDekMsTUFBTSxVQUFVLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25ELHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO2FBQ25DO1lBRUQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO2dCQUN2QixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7YUFDVjtRQUNILENBQUMsQ0FBQTtRQUVELHFGQUFxRjtRQUNyRixJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUE7UUFDM0IsTUFBTSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2xDLElBQUksZUFBZTtnQkFBRSxPQUFNO1lBQzNCLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdEIsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZCxlQUFlLEdBQUcsS0FBSyxDQUFBO2dCQUN2QixXQUFXLEVBQUUsQ0FBQTtZQUNmLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNWLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDdkUsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRTVDLHFEQUFxRDtRQUNyRCxJQUFJLHlCQUF5QixHQUFHLENBQUMsSUFBcUIsRUFBRSxFQUFFLEdBQUUsQ0FBQyxDQUFBO1FBRTdELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxJQUFxQixFQUFFLEVBQUU7WUFDdkQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU07Z0JBQUUsT0FBTTtZQUUzQixtREFBbUQ7WUFDbkQseUJBQXlCO1lBQ3pCLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUM7b0JBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDekQsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNO2dCQUFFLE9BQU07WUFFckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFakUsZUFBZSxtQ0FBUSxlQUFlLEdBQUssSUFBSSxDQUFFLENBQUE7WUFDakQsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVDLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQTtRQUVELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxHQUEwQixFQUFFLEtBQVUsRUFBRSxFQUFFO1lBQ3ZFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDM0UsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtZQUM1QixRQUFRLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDNUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFBO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQXFCLEVBQUUsRUFBRTtZQUNwRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRSxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQ3RCLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM1Qyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUE7UUFFRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsRUFBRTtZQUM5QixPQUFPLGVBQWUsQ0FBQTtRQUN4QixDQUFDLENBQUE7UUFFRCxNQUFNLDRCQUE0QixHQUFHLENBQUMsSUFBcUMsRUFBRSxFQUFFO1lBQzdFLHlCQUF5QixHQUFHLElBQUksQ0FBQTtRQUNsQyxDQUFDLENBQUE7UUFFRCx1REFBdUQ7UUFDdkQsTUFBTSxhQUFhLEdBQUcsR0FBUyxFQUFFO1lBQy9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGdCQUFnQixFQUFFLENBQUE7WUFDdkMsT0FBTyxNQUFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELENBQUMsQ0FBQSxDQUFBO1FBRUQsbURBQW1EO1FBQ25ELE1BQU0sYUFBYSxHQUFHLEdBQVMsRUFBRTtZQUMvQixnRUFBZ0U7WUFDaEUscUVBQXFFO1lBQ3JFLHdFQUF3RTtZQUN4RSx1QkFBdUI7WUFDdkIsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osT0FBTyxPQUFPLEVBQUUsQ0FBQTthQUNqQjtZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUE7WUFDcEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDdEcsT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsa0VBQWtFO1FBQ2xFLE1BQU0sYUFBYSxHQUFHLEdBQVMsRUFBRTtZQUMvQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFBO1lBQ3BDLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFFLENBQUMsSUFBSSxDQUFBO1FBQzVFLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFvQyxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxFQUFFLENBQUE7WUFDaEMsYUFBYTtZQUNiLE9BQU8sTUFBTSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLENBQUMsQ0FBQSxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRyxDQUFBO1FBQzdDLE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtRQUN6QyxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTNELE1BQU0sVUFBVSxHQUFHLENBQU8sY0FBb0MsRUFBRSxFQUFFO1lBQ2hFLE1BQU0sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsc0JBQVEsQ0FBQyxDQUFBO1lBQ2xHLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQ25DLElBQUksY0FBYyxFQUFFO2dCQUNsQixjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNsRDtZQUVELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFekUsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDL0IsU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxlQUFlO2dCQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVk7YUFDeEIsQ0FBQyxDQUFBO1lBRUYsT0FBTztnQkFDTCxPQUFPO2dCQUNQLE1BQU07Z0JBQ04sSUFBSTtnQkFDSixLQUFLO2FBQ04sQ0FBQTtRQUNILENBQUMsQ0FBQSxDQUFBO1FBRUQ7Ozs7O1dBS0c7UUFDSCxNQUFNLGVBQWUsR0FBRyxHQUFTLEVBQUU7WUFDakMsTUFBTSxLQUFLLEdBQUcsTUFBTSxVQUFVLEVBQUUsQ0FBQTtZQUNoQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUE7UUFDdEIsQ0FBQyxDQUFBLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFTLEVBQUU7WUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFlLEVBQUUsQ0FBQTtZQUN2QyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDZCxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQzlDLENBQUMsQ0FBQSxDQUFBO1FBRUQsdURBQXVEO1FBQ3ZELE1BQU0saUJBQWlCLEdBQUcsNEJBQWlCLENBQUE7UUFFM0MsV0FBVyxFQUFFLENBQUE7UUFFYixPQUFPO1lBQ0wsb0NBQW9DO1lBQ3BDLE1BQU07WUFDTiw0RUFBNEU7WUFDNUUsaUJBQWlCO1lBQ2pCLGlDQUFpQztZQUNqQyxNQUFNO1lBQ04sbUVBQW1FO1lBQ25FLFFBQVE7WUFDUix1RUFBdUU7WUFDdkUsTUFBTTtZQUNOLHNLQUFzSztZQUN0SyxnQkFBZ0I7WUFDaEIsOE1BQThNO1lBQzlNLEtBQUs7WUFDTCxrRUFBa0U7WUFDbEUsYUFBYTtZQUNiLDhFQUE4RTtZQUM5RSxhQUFhO1lBQ2IseURBQXlEO1lBQ3pELGFBQWE7WUFDYixxRUFBcUU7WUFDckUsVUFBVTtZQUNWLHVJQUF1STtZQUN2SSxRQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLE9BQU87WUFDUCxrRkFBa0Y7WUFDbEYsT0FBTztZQUNQLHVIQUF1SDtZQUN2SCxNQUFNO1lBQ04sb0RBQW9EO1lBQ3BELEVBQUU7WUFDRjs7Ozs7Ozs7Ozs7O2VBWUc7WUFDSCxVQUFVO1lBQ1YsbUVBQW1FO1lBQ25FLGVBQWU7WUFDZiw4Q0FBOEM7WUFDOUMsZ0JBQWdCO1lBQ2hCLDZDQUE2QztZQUM3QyxrQkFBa0I7WUFDbEIsNkNBQTZDO1lBQzdDLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MscUJBQXFCO1lBQ3JCLHFEQUFxRDtZQUNyRCxzQkFBc0I7WUFDdEIsaUVBQWlFO1lBQ2pFLDRCQUE0QjtZQUM1QixrRUFBa0U7WUFDbEUsUUFBUSxFQUFSLHNCQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLGlDQUFpQyxFQUFqQyxtREFBaUM7WUFDakM7Ozs7ZUFJRztZQUNILDBCQUEwQixFQUFFLDBCQUEwQjtZQUN0RCwwRUFBMEU7WUFDMUUsMEJBQTBCO1lBQzFCLDZGQUE2RjtZQUM3Rix1QkFBdUIsRUFBRSxRQUFRO1lBQ2pDLG9GQUFvRjtZQUNwRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsZ0RBQWdEO1lBQ2hELG1CQUFtQjtTQUNwQixDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBMVZZLFFBQUEsdUJBQXVCLDJCQTBWbkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzYW5kYm94VGhlbWUsIHNhbmRib3hUaGVtZURhcmsgfSBmcm9tIFwiLi90aGVtZVwiXG5pbXBvcnQgeyBUeXBlU2NyaXB0V29ya2VyIH0gZnJvbSBcIi4vdHNXb3JrZXJcIlxuaW1wb3J0IHtcbiAgZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMsXG4gIGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMsXG4gIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbn0gZnJvbSBcIi4vY29tcGlsZXJPcHRpb25zXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcbmltcG9ydCB7IHN1cHBvcnRlZFJlbGVhc2VzIH0gZnJvbSBcIi4vcmVsZWFzZXNcIlxuaW1wb3J0IHsgZ2V0SW5pdGlhbENvZGUgfSBmcm9tIFwiLi9nZXRJbml0aWFsQ29kZVwiXG5pbXBvcnQgeyBleHRyYWN0VHdvU2xhc2hDb21waWxlck9wdGlvbnMsIHR3b3NsYXNoQ29tcGxldGlvbnMgfSBmcm9tIFwiLi90d29zbGFzaFN1cHBvcnRcIlxuaW1wb3J0ICogYXMgdHN2ZnMgZnJvbSBcIi4vdmVuZG9yL3R5cGVzY3JpcHQtdmZzXCJcbmltcG9ydCB7IHNldHVwVHlwZUFjcXVpc2l0aW9uIH0gZnJvbSBcIi4vdmVuZG9yL2F0YS9pbmRleFwiXG5cbnR5cGUgQ29tcGlsZXJPcHRpb25zID0gaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5sYW5ndWFnZXMudHlwZXNjcmlwdC5Db21waWxlck9wdGlvbnNcbnR5cGUgTW9uYWNvID0gdHlwZW9mIGltcG9ydChcIm1vbmFjby1lZGl0b3JcIilcblxuLyoqXG4gKiBUaGVzZSBhcmUgc2V0dGluZ3MgZm9yIHRoZSBwbGF5Z3JvdW5kIHdoaWNoIGFyZSB0aGUgZXF1aXZhbGVudCB0byBwcm9wcyBpbiBSZWFjdFxuICogYW55IGNoYW5nZXMgdG8gaXQgc2hvdWxkIHJlcXVpcmUgYSBuZXcgc2V0dXAgb2YgdGhlIHBsYXlncm91bmRcbiAqL1xuZXhwb3J0IHR5cGUgU2FuZGJveENvbmZpZyA9IHtcbiAgLyoqIFRoZSBkZWZhdWx0IHNvdXJjZSBjb2RlIGZvciB0aGUgcGxheWdyb3VuZCAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIEBkZXByZWNhdGVkICovXG4gIHVzZUphdmFTY3JpcHQ/OiBib29sZWFuXG4gIC8qKiBUaGUgZGVmYXVsdCBmaWxlIGZvciB0aGUgcGxheWdyb3VuZCAgKi9cbiAgZmlsZXR5cGU6IFwianNcIiB8IFwidHNcIiB8IFwiZC50c1wiXG4gIC8qKiBDb21waWxlciBvcHRpb25zIHdoaWNoIGFyZSBhdXRvbWF0aWNhbGx5IGp1c3QgZm9yd2FyZGVkIG9uICovXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIC8qKiBPcHRpb25hbCBtb25hY28gc2V0dGluZ3Mgb3ZlcnJpZGVzICovXG4gIG1vbmFjb1NldHRpbmdzPzogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnNcbiAgLyoqIEFjcXVpcmUgdHlwZXMgdmlhIHR5cGUgYWNxdWlzaXRpb24gKi9cbiAgYWNxdWlyZVR5cGVzOiBib29sZWFuXG4gIC8qKiBTdXBwb3J0IHR3b3NsYXNoIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBib29sZWFuXG4gIC8qKiBHZXQgdGhlIHRleHQgdmlhIHF1ZXJ5IHBhcmFtcyBhbmQgbG9jYWwgc3RvcmFnZSwgdXNlZnVsIHdoZW4gdGhlIGVkaXRvciBpcyB0aGUgbWFpbiBleHBlcmllbmNlICovXG4gIHN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dD86IHRydWVcbiAgLyoqIFN1cHByZXNzIHNldHRpbmcgY29tcGlsZXIgb3B0aW9ucyBmcm9tIHRoZSBjb21waWxlciBmbGFncyBmcm9tIHF1ZXJ5IHBhcmFtcyAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncz86IHRydWVcbiAgLyoqIE9wdGlvbmFsIHBhdGggdG8gVHlwZVNjcmlwdCB3b3JrZXIgd3JhcHBlciBjbGFzcyBzY3JpcHQsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L21vbmFjby10eXBlc2NyaXB0L3B1bGwvNjUgICovXG4gIGN1c3RvbVR5cGVTY3JpcHRXb3JrZXJQYXRoPzogc3RyaW5nXG4gIC8qKiBMb2dnaW5nIHN5c3RlbSAqL1xuICBsb2dnZXI6IHtcbiAgICBsb2c6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGVycm9yOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cENvbGxhcHNlZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZ3JvdXBFbmQ6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICB9XG59ICYgKFxuICB8IHsgLyoqIHRoZSBJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZG9tSUQ6IHN0cmluZyB9XG4gIHwgeyAvKiogdGhlIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZWxlbWVudFRvQXBwZW5kOiBIVE1MRWxlbWVudCB9XG4pXG5cbmNvbnN0IGxhbmd1YWdlVHlwZSA9IChjb25maWc6IFNhbmRib3hDb25maWcpID0+IChjb25maWcuZmlsZXR5cGUgPT09IFwianNcIiA/IFwiamF2YXNjcmlwdFwiIDogXCJ0eXBlc2NyaXB0XCIpXG5cbi8vIEJhc2ljYWxseSBhbmRyb2lkIGFuZCBtb25hY28gaXMgcHJldHR5IGJhZCwgdGhpcyBtYWtlcyBpdCBsZXNzIGJhZFxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvcHh0L3B1bGwvNzA5OSBmb3IgdGhpcywgYW5kIHRoZSBsb25nXG4vLyByZWFkIGlzIGluIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvbW9uYWNvLWVkaXRvci9pc3N1ZXMvNTYzXG5jb25zdCBpc0FuZHJvaWQgPSBuYXZpZ2F0b3IgJiYgL2FuZHJvaWQvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cbi8qKiBEZWZhdWx0IE1vbmFjbyBzZXR0aW5ncyBmb3IgcGxheWdyb3VuZCAqL1xuY29uc3Qgc2hhcmVkRWRpdG9yT3B0aW9uczogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnMgPSB7XG4gIHNjcm9sbEJleW9uZExhc3RMaW5lOiB0cnVlLFxuICBzY3JvbGxCZXlvbmRMYXN0Q29sdW1uOiAzLFxuICBtaW5pbWFwOiB7XG4gICAgZW5hYmxlZDogZmFsc2UsXG4gIH0sXG4gIGxpZ2h0YnVsYjoge1xuICAgIGVuYWJsZWQ6IHRydWUsXG4gIH0sXG4gIHF1aWNrU3VnZ2VzdGlvbnM6IHtcbiAgICBvdGhlcjogIWlzQW5kcm9pZCxcbiAgICBjb21tZW50czogIWlzQW5kcm9pZCxcbiAgICBzdHJpbmdzOiAhaXNBbmRyb2lkLFxuICB9LFxuICBhY2NlcHRTdWdnZXN0aW9uT25Db21taXRDaGFyYWN0ZXI6ICFpc0FuZHJvaWQsXG4gIGFjY2VwdFN1Z2dlc3Rpb25PbkVudGVyOiAhaXNBbmRyb2lkID8gXCJvblwiIDogXCJvZmZcIixcbiAgYWNjZXNzaWJpbGl0eVN1cHBvcnQ6ICFpc0FuZHJvaWQgPyBcIm9uXCIgOiBcIm9mZlwiLFxuICBpbmxheUhpbnRzOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgfSxcbn1cblxuLyoqIFRoZSBkZWZhdWx0IHNldHRpbmdzIHdoaWNoIHdlIGFwcGx5IGEgcGFydGlhbCBvdmVyICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFBsYXlncm91bmRTZXR0aW5ncygpIHtcbiAgY29uc3QgY29uZmlnOiBTYW5kYm94Q29uZmlnID0ge1xuICAgIHRleHQ6IFwiXCIsXG4gICAgZG9tSUQ6IFwiXCIsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7fSxcbiAgICBhY3F1aXJlVHlwZXM6IHRydWUsXG4gICAgZmlsZXR5cGU6IFwidHNcIixcbiAgICBzdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnM6IGZhbHNlLFxuICAgIGxvZ2dlcjogY29uc29sZSxcbiAgfVxuICByZXR1cm4gY29uZmlnXG59XG5cbmZ1bmN0aW9uIGRlZmF1bHRGaWxlUGF0aChjb25maWc6IFNhbmRib3hDb25maWcsIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBtb25hY286IE1vbmFjbykge1xuICBjb25zdCBpc0pTWCA9IGNvbXBpbGVyT3B0aW9ucy5qc3ggIT09IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Kc3hFbWl0Lk5vbmVcbiAgY29uc3QgZXh0ID0gaXNKU1ggJiYgY29uZmlnLmZpbGV0eXBlICE9PSBcImQudHNcIiA/IGNvbmZpZy5maWxldHlwZSArIFwieFwiIDogY29uZmlnLmZpbGV0eXBlXG4gIHJldHVybiBcImlucHV0LlwiICsgZXh0XG59XG5cbi8qKiBDcmVhdGVzIGEgbW9uYWNvIGZpbGUgcmVmZXJlbmNlLCBiYXNpY2FsbHkgYSBmYW5jeSBwYXRoICovXG5mdW5jdGlvbiBjcmVhdGVGaWxlVXJpKGNvbmZpZzogU2FuZGJveENvbmZpZywgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsIG1vbmFjbzogTW9uYWNvKSB7XG4gIHJldHVybiBtb25hY28uVXJpLmZpbGUoZGVmYXVsdEZpbGVQYXRoKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pKVxufVxuXG4vKiogQ3JlYXRlcyBhIHNhbmRib3ggZWRpdG9yLCBhbmQgcmV0dXJucyBhIHNldCBvZiB1c2VmdWwgZnVuY3Rpb25zIGFuZCB0aGUgZWRpdG9yICovXG5leHBvcnQgY29uc3QgY3JlYXRlVHlwZVNjcmlwdFNhbmRib3ggPSAoXG4gIHBhcnRpYWxDb25maWc6IFBhcnRpYWw8U2FuZGJveENvbmZpZz4sXG4gIG1vbmFjbzogTW9uYWNvLFxuICB0czogdHlwZW9mIGltcG9ydChcInR5cGVzY3JpcHRcIilcbikgPT4ge1xuICBjb25zdCBjb25maWcgPSB7IC4uLmRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSwgLi4ucGFydGlhbENvbmZpZyB9XG4gIGlmICghKFwiZG9tSURcIiBpbiBjb25maWcpICYmICEoXCJlbGVtZW50VG9BcHBlbmRcIiBpbiBjb25maWcpKVxuICAgIHRocm93IG5ldyBFcnJvcihcIllvdSBkaWQgbm90IHByb3ZpZGUgYSBkb21JRCBvciBlbGVtZW50VG9BcHBlbmRcIilcblxuICBjb25zdCBkZWZhdWx0VGV4dCA9IGNvbmZpZy5zdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nRGVmYXVsdFRleHRcbiAgICA/IGNvbmZpZy50ZXh0XG4gICAgOiBnZXRJbml0aWFsQ29kZShjb25maWcudGV4dCwgZG9jdW1lbnQubG9jYXRpb24pXG5cbiAgLy8gRGVmYXVsdHNcbiAgY29uc3QgY29tcGlsZXJEZWZhdWx0cyA9IGdldERlZmF1bHRTYW5kYm94Q29tcGlsZXJPcHRpb25zKGNvbmZpZywgbW9uYWNvKVxuXG4gIC8vIEdyYWIgdGhlIGNvbXBpbGVyIGZsYWdzIHZpYSB0aGUgcXVlcnkgcGFyYW1zXG4gIGxldCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc1xuICBpZiAoIWNvbmZpZy5zdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncykge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGxldCBxdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zID0gZ2V0Q29tcGlsZXJPcHRpb25zRnJvbVBhcmFtcyhjb21waWxlckRlZmF1bHRzLCB0cywgcGFyYW1zKVxuICAgIGlmIChPYmplY3Qua2V5cyhxdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zKS5sZW5ndGgpXG4gICAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gRm91bmQgY29tcGlsZXIgb3B0aW9ucyBpbiBxdWVyeSBwYXJhbXM6IFwiLCBxdWVyeVBhcmFtQ29tcGlsZXJPcHRpb25zKVxuICAgIGNvbXBpbGVyT3B0aW9ucyA9IHsgLi4uY29tcGlsZXJEZWZhdWx0cywgLi4ucXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucyB9XG4gIH0gZWxzZSB7XG4gICAgY29tcGlsZXJPcHRpb25zID0gY29tcGlsZXJEZWZhdWx0c1xuICB9XG5cbiAgY29uc3QgaXNKU0xhbmcgPSBjb25maWcuZmlsZXR5cGUgPT09IFwianNcIlxuICAvLyBEb24ndCBhbGxvdyBhIHN0YXRlIGxpa2UgYWxsb3dKcyA9IGZhbHNlXG4gIGlmIChpc0pTTGFuZykge1xuICAgIGNvbXBpbGVyT3B0aW9ucy5hbGxvd0pzID0gdHJ1ZVxuICB9XG5cbiAgY29uc3QgbGFuZ3VhZ2UgPSBsYW5ndWFnZVR5cGUoY29uZmlnKVxuICBjb25zdCBmaWxlUGF0aCA9IGNyZWF0ZUZpbGVVcmkoY29uZmlnLCBjb21waWxlck9wdGlvbnMsIG1vbmFjbylcbiAgY29uc3QgZWxlbWVudCA9IFwiZG9tSURcIiBpbiBjb25maWcgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjb25maWcuZG9tSUQpIDogKGNvbmZpZyBhcyBhbnkpLmVsZW1lbnRUb0FwcGVuZFxuXG4gIGNvbnN0IG1vZGVsID0gbW9uYWNvLmVkaXRvci5jcmVhdGVNb2RlbChkZWZhdWx0VGV4dCwgbGFuZ3VhZ2UsIGZpbGVQYXRoKVxuICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKFwic2FuZGJveFwiLCBzYW5kYm94VGhlbWUpXG4gIG1vbmFjby5lZGl0b3IuZGVmaW5lVGhlbWUoXCJzYW5kYm94LWRhcmtcIiwgc2FuZGJveFRoZW1lRGFyaylcbiAgbW9uYWNvLmVkaXRvci5zZXRUaGVtZShcInNhbmRib3hcIilcblxuICBjb25zdCBtb25hY29TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oeyBtb2RlbCB9LCBzaGFyZWRFZGl0b3JPcHRpb25zLCBjb25maWcubW9uYWNvU2V0dGluZ3MgfHwge30pXG4gIGNvbnN0IGVkaXRvciA9IG1vbmFjby5lZGl0b3IuY3JlYXRlKGVsZW1lbnQsIG1vbmFjb1NldHRpbmdzKVxuXG4gIGNvbnN0IGdldFdvcmtlciA9IGlzSlNMYW5nXG4gICAgPyBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuZ2V0SmF2YVNjcmlwdFdvcmtlclxuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldFR5cGVTY3JpcHRXb3JrZXJcblxuICBjb25zdCBkZWZhdWx0cyA9IGlzSlNMYW5nXG4gICAgPyBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuamF2YXNjcmlwdERlZmF1bHRzXG4gICAgOiBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQudHlwZXNjcmlwdERlZmF1bHRzXG5cbiAgLy8gQHRzLWlnbm9yZSAtIHRoZXNlIGV4aXN0XG4gIGlmIChjb25maWcuY3VzdG9tVHlwZVNjcmlwdFdvcmtlclBhdGggJiYgZGVmYXVsdHMuc2V0V29ya2VyT3B0aW9ucykge1xuICAgIC8vIEB0cy1pZ25vcmUgLSB0aGlzIGZ1bmMgbXVzdCBleGlzdCB0byBoYXZlIGdvdCBoZXJlXG4gICAgZGVmYXVsdHMuc2V0V29ya2VyT3B0aW9ucyh7XG4gICAgICBjdXN0b21Xb3JrZXJQYXRoOiBjb25maWcuY3VzdG9tVHlwZVNjcmlwdFdvcmtlclBhdGgsXG4gICAgfSlcbiAgfVxuXG4gIGRlZmF1bHRzLnNldERpYWdub3N0aWNzT3B0aW9ucyh7XG4gICAgLi4uZGVmYXVsdHMuZ2V0RGlhZ25vc3RpY3NPcHRpb25zKCksXG4gICAgbm9TZW1hbnRpY1ZhbGlkYXRpb246IGZhbHNlLFxuICAgIC8vIFRoaXMgaXMgd2hlbiB0c2xpYiBpcyBub3QgZm91bmRcbiAgICBkaWFnbm9zdGljQ29kZXNUb0lnbm9yZTogWzIzNTRdLFxuICB9KVxuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBfcGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcGF0aCA9IFwiZmlsZTovL1wiICsgX3BhdGhcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbnN0IHVyaSA9IG1vbmFjby5VcmkuZmlsZShwYXRoKVxuICAgIGlmIChtb25hY28uZWRpdG9yLmdldE1vZGVsKHVyaSkgPT09IG51bGwpIHtcbiAgICAgIG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoY29kZSwgXCJqYXZhc2NyaXB0XCIsIHVyaSlcbiAgICB9XG4gICAgY29uZmlnLmxvZ2dlci5sb2coYFtBVEFdIEFkZGluZyAke3BhdGh9IHRvIHJ1bnRpbWVgLCB7IGNvZGUgfSlcbiAgfVxuXG4gIGNvbnN0IGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zID0gZXh0cmFjdFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zKHRzKVxuXG4gIC8vIEF1dG8tY29tcGxldGUgdHdvc2xhc2ggY29tbWVudHNcbiAgaWYgKGNvbmZpZy5zdXBwb3J0VHdvc2xhc2hDb21waWxlck9wdGlvbnMpIHtcbiAgICBjb25zdCBsYW5ncyA9IFtcImphdmFzY3JpcHRcIiwgXCJ0eXBlc2NyaXB0XCJdXG4gICAgbGFuZ3MuZm9yRWFjaChsID0+XG4gICAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyQ29tcGxldGlvbkl0ZW1Qcm92aWRlcihsLCB7XG4gICAgICAgIHRyaWdnZXJDaGFyYWN0ZXJzOiBbXCJAXCIsIFwiL1wiLCBcIi1cIl0sXG4gICAgICAgIHByb3ZpZGVDb21wbGV0aW9uSXRlbXM6IHR3b3NsYXNoQ29tcGxldGlvbnModHMsIG1vbmFjbyksXG4gICAgICB9KVxuICAgIClcbiAgfVxuXG4gIGNvbnN0IGF0YSA9IHNldHVwVHlwZUFjcXVpc2l0aW9uKHtcbiAgICBwcm9qZWN0TmFtZTogXCJUeXBlU2NyaXB0IFBsYXlncm91bmRcIixcbiAgICB0eXBlc2NyaXB0OiB0cyxcbiAgICBsb2dnZXI6IGNvbnNvbGUsXG4gICAgZGVsZWdhdGU6IHtcbiAgICAgIHJlY2VpdmVkRmlsZTogYWRkTGlicmFyeVRvUnVudGltZSxcbiAgICAgIHByb2dyZXNzOiAoZG93bmxvYWRlZDogbnVtYmVyLCB0b3RhbDogbnVtYmVyKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHsgZGwsIHR0bCB9KVxuICAgICAgfSxcbiAgICAgIHN0YXJ0ZWQ6ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coXCJBVEEgc3RhcnRcIilcbiAgICAgIH0sXG4gICAgICBmaW5pc2hlZDogZiA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQVRBIGRvbmVcIilcbiAgICAgIH0sXG4gICAgfSxcbiAgfSlcblxuICBjb25zdCB0ZXh0VXBkYXRlZCA9ICgpID0+IHtcbiAgICBjb25zdCBjb2RlID0gZWRpdG9yLmdldE1vZGVsKCkhLmdldFZhbHVlKClcblxuICAgIGlmIChjb25maWcuc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zKSB7XG4gICAgICBjb25zdCBjb25maWdPcHRzID0gZ2V0VHdvU2xhc2hDb21waWxlck9wdGlvbnMoY29kZSlcbiAgICAgIHVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoY29uZmlnT3B0cylcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmFjcXVpcmVUeXBlcykge1xuICAgICAgYXRhKGNvZGUpXG4gICAgfVxuICB9XG5cbiAgLy8gRGVib3VuY2VkIHNhbmRib3ggZmVhdHVyZXMgbGlrZSB0d29zbGFzaCBhbmQgdHlwZSBhY3F1aXNpdGlvbiB0byBvbmNlIGV2ZXJ5IHNlY29uZFxuICBsZXQgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgZWRpdG9yLm9uRGlkQ2hhbmdlTW9kZWxDb250ZW50KF9lID0+IHtcbiAgICBpZiAoZGVib3VuY2luZ1RpbWVyKSByZXR1cm5cbiAgICBkZWJvdW5jaW5nVGltZXIgPSB0cnVlXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICAgICAgdGV4dFVwZGF0ZWQoKVxuICAgIH0sIDEwMDApXG4gIH0pXG5cbiAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldCBjb21waWxlciBvcHRpb25zOiBcIiwgY29tcGlsZXJPcHRpb25zKVxuICBkZWZhdWx0cy5zZXRDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKVxuXG4gIC8vIFRvIGxldCBjbGllbnRzIHBsdWcgaW50byBjb21waWxlciBzZXR0aW5ncyBjaGFuZ2VzXG4gIGxldCBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge31cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IG5ld0tleXMgPSBPYmplY3Qua2V5cyhvcHRzKVxuICAgIGlmICghbmV3S2V5cy5sZW5ndGgpIHJldHVyblxuXG4gICAgLy8gRG9uJ3QgdXBkYXRlIGEgY29tcGlsZXIgc2V0dGluZyBpZiBpdCdzIHRoZSBzYW1lXG4gICAgLy8gYXMgdGhlIGN1cnJlbnQgc2V0dGluZ1xuICAgIG5ld0tleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVyT3B0aW9uc1trZXldID09IG9wdHNba2V5XSkgZGVsZXRlIG9wdHNba2V5XVxuICAgIH0pXG5cbiAgICBpZiAoIU9iamVjdC5rZXlzKG9wdHMpLmxlbmd0aCkgcmV0dXJuXG5cbiAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gVXBkYXRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG5cbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyT3B0aW9ucywgLi4ub3B0cyB9XG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZUNvbXBpbGVyU2V0dGluZyA9IChrZXk6IGtleW9mIENvbXBpbGVyT3B0aW9ucywgdmFsdWU6IGFueSkgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgXCIsIGtleSwgXCJ0b1wiLCB2YWx1ZSlcbiAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlXG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHNldENvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7XG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldHRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG4gICAgY29tcGlsZXJPcHRpb25zID0gb3B0c1xuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBnZXRDb21waWxlck9wdGlvbnMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBpbGVyT3B0aW9uc1xuICB9XG5cbiAgY29uc3Qgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChmdW5jOiAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB2b2lkKSA9PiB7XG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IGZ1bmNcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSByZXN1bHRzIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RW1pdFJlc3VsdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtb2RlbCA9IGVkaXRvci5nZXRNb2RlbCgpIVxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IGdldFdvcmtlclByb2Nlc3MoKVxuICAgIHJldHVybiBhd2FpdCBjbGllbnQuZ2V0RW1pdE91dHB1dChtb2RlbC51cmkudG9TdHJpbmcoKSlcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBKUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXRSdW5uYWJsZUpTID0gYXN5bmMgKCkgPT4ge1xuICAgIC8vIFRoaXMgaXNuJ3QgcXVpdGUgX3JpZ2h0XyBpbiB0aGVvcnksIHdlIGNhbiBkb3dubGV2ZWwgSlMgLT4gSlNcbiAgICAvLyBidXQgYSBicm93c2VyIGlzIGJhc2ljYWxseSBhbHdheXMgZXNuZXh0LXkgYW5kIHNldHRpbmcgYWxsb3dKcyBhbmRcbiAgICAvLyBjaGVja0pzIGRvZXMgbm90IGFjdHVhbGx5IGdpdmUgdGhlIGRvd25sZXZlbCdkIC5qcyBmaWxlIGluIHRoZSBvdXRwdXRcbiAgICAvLyBsYXRlciBkb3duIHRoZSBsaW5lLlxuICAgIGlmIChpc0pTTGFuZykge1xuICAgICAgcmV0dXJuIGdldFRleHQoKVxuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFbWl0UmVzdWx0KClcbiAgICBjb25zdCBmaXJzdEpTID0gcmVzdWx0Lm91dHB1dEZpbGVzLmZpbmQoKG86IGFueSkgPT4gby5uYW1lLmVuZHNXaXRoKFwiLmpzXCIpIHx8IG8ubmFtZS5lbmRzV2l0aChcIi5qc3hcIikpXG4gICAgcmV0dXJuIChmaXJzdEpTICYmIGZpcnN0SlMudGV4dCkgfHwgXCJcIlxuICB9XG5cbiAgLyoqIEdldHMgdGhlIERUUyBmb3IgdGhlIEpTL1RTICBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldERUU0ZvckNvZGUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RW1pdFJlc3VsdCgpXG4gICAgcmV0dXJuIHJlc3VsdC5vdXRwdXRGaWxlcy5maW5kKChvOiBhbnkpID0+IG8ubmFtZS5lbmRzV2l0aChcIi5kLnRzXCIpKSEudGV4dFxuICB9XG5cbiAgY29uc3QgZ2V0V29ya2VyUHJvY2VzcyA9IGFzeW5jICgpOiBQcm9taXNlPFR5cGVTY3JpcHRXb3JrZXI+ID0+IHtcbiAgICBjb25zdCB3b3JrZXIgPSBhd2FpdCBnZXRXb3JrZXIoKVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICByZXR1cm4gYXdhaXQgd29ya2VyKG1vZGVsLnVyaSlcbiAgfVxuXG4gIGNvbnN0IGdldERvbU5vZGUgPSAoKSA9PiBlZGl0b3IuZ2V0RG9tTm9kZSgpIVxuICBjb25zdCBnZXRNb2RlbCA9ICgpID0+IGVkaXRvci5nZXRNb2RlbCgpIVxuICBjb25zdCBnZXRUZXh0ID0gKCkgPT4gZ2V0TW9kZWwoKS5nZXRWYWx1ZSgpXG4gIGNvbnN0IHNldFRleHQgPSAodGV4dDogc3RyaW5nKSA9PiBnZXRNb2RlbCgpLnNldFZhbHVlKHRleHQpXG5cbiAgY29uc3Qgc2V0dXBUU1ZGUyA9IGFzeW5jIChmc01hcEFkZGl0aW9ucz86IE1hcDxzdHJpbmcsIHN0cmluZz4pID0+IHtcbiAgICBjb25zdCBmc01hcCA9IGF3YWl0IHRzdmZzLmNyZWF0ZURlZmF1bHRNYXBGcm9tQ0ROKGNvbXBpbGVyT3B0aW9ucywgdHMudmVyc2lvbiwgdHJ1ZSwgdHMsIGx6c3RyaW5nKVxuICAgIGZzTWFwLnNldChmaWxlUGF0aC5wYXRoLCBnZXRUZXh0KCkpXG4gICAgaWYgKGZzTWFwQWRkaXRpb25zKSB7XG4gICAgICBmc01hcEFkZGl0aW9ucy5mb3JFYWNoKCh2LCBrKSA9PiBmc01hcC5zZXQoaywgdikpXG4gICAgfVxuXG4gICAgY29uc3Qgc3lzdGVtID0gdHN2ZnMuY3JlYXRlU3lzdGVtKGZzTWFwKVxuICAgIGNvbnN0IGhvc3QgPSB0c3Zmcy5jcmVhdGVWaXJ0dWFsQ29tcGlsZXJIb3N0KHN5c3RlbSwgY29tcGlsZXJPcHRpb25zLCB0cylcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHtcbiAgICAgIHJvb3ROYW1lczogWy4uLmZzTWFwLmtleXMoKV0sXG4gICAgICBvcHRpb25zOiBjb21waWxlck9wdGlvbnMsXG4gICAgICBob3N0OiBob3N0LmNvbXBpbGVySG9zdCxcbiAgICB9KVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2dyYW0sXG4gICAgICBzeXN0ZW0sXG4gICAgICBob3N0LFxuICAgICAgZnNNYXAsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBUUyBQcm9ncmFtLCBpZiB5b3UncmUgZG9pbmcgYW55dGhpbmcgY29tcGxleFxuICAgKiBpdCdzIGxpa2VseSB5b3Ugd2FudCBzZXR1cFRTVkZTIGluc3RlYWQgYW5kIGNhbiBwdWxsIHByb2dyYW0gb3V0IGZyb20gdGhhdFxuICAgKlxuICAgKiBXYXJuaW5nOiBSdW5zIG9uIHRoZSBtYWluIHRocmVhZFxuICAgKi9cbiAgY29uc3QgY3JlYXRlVFNQcm9ncmFtID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRzdmZzID0gYXdhaXQgc2V0dXBUU1ZGUygpXG4gICAgcmV0dXJuIHRzdmZzLnByb2dyYW1cbiAgfVxuXG4gIGNvbnN0IGdldEFTVCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwcm9ncmFtID0gYXdhaXQgY3JlYXRlVFNQcm9ncmFtKClcbiAgICBwcm9ncmFtLmVtaXQoKVxuICAgIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZVBhdGgucGF0aCkhXG4gIH1cblxuICAvLyBQYXNzIGFsb25nIHRoZSBzdXBwb3J0ZWQgcmVsZWFzZXMgZm9yIHRoZSBwbGF5Z3JvdW5kXG4gIGNvbnN0IHN1cHBvcnRlZFZlcnNpb25zID0gc3VwcG9ydGVkUmVsZWFzZXNcblxuICB0ZXh0VXBkYXRlZCgpXG5cbiAgcmV0dXJuIHtcbiAgICAvKiogVGhlIHNhbWUgY29uZmlnIHlvdSBwYXNzZWQgaW4gKi9cbiAgICBjb25maWcsXG4gICAgLyoqIEEgbGlzdCBvZiBUeXBlU2NyaXB0IHZlcnNpb25zIHlvdSBjYW4gdXNlIHdpdGggdGhlIFR5cGVTY3JpcHQgc2FuZGJveCAqL1xuICAgIHN1cHBvcnRlZFZlcnNpb25zLFxuICAgIC8qKiBUaGUgbW9uYWNvIGVkaXRvciBpbnN0YW5jZSAqL1xuICAgIGVkaXRvcixcbiAgICAvKiogRWl0aGVyIFwidHlwZXNjcmlwdFwiIG9yIFwiamF2YXNjcmlwdFwiIGRlcGVuZGluZyBvbiB5b3VyIGNvbmZpZyAqL1xuICAgIGxhbmd1YWdlLFxuICAgIC8qKiBUaGUgb3V0ZXIgbW9uYWNvIG1vZHVsZSwgdGhlIHJlc3VsdCBvZiByZXF1aXJlKFwibW9uYWNvLWVkaXRvclwiKSAgKi9cbiAgICBtb25hY28sXG4gICAgLyoqIEdldHMgYSBtb25hY28tdHlwZXNjcmlwdCB3b3JrZXIsIHRoaXMgd2lsbCBnaXZlIHlvdSBhY2Nlc3MgdG8gYSBsYW5ndWFnZSBzZXJ2ZXIuIE5vdGU6IHByZWZlciB0aGlzIGZvciBsYW5ndWFnZSBzZXJ2ZXIgd29yayBiZWNhdXNlIGl0IGhhcHBlbnMgb24gYSB3ZWJ3b3JrZXIgLiAqL1xuICAgIGdldFdvcmtlclByb2Nlc3MsXG4gICAgLyoqIEEgY29weSBvZiByZXF1aXJlKFwiQHR5cGVzY3JpcHQvdmZzXCIpIHRoaXMgY2FuIGJlIHVzZWQgdG8gcXVpY2tseSBzZXQgdXAgYW4gaW4tbWVtb3J5IGNvbXBpbGVyIHJ1bnMgZm9yIEFTVHMsIG9yIHRvIGdldCBjb21wbGV4IGxhbmd1YWdlIHNlcnZlciByZXN1bHRzIChhbnl0aGluZyBhYm92ZSBoYXMgdG8gYmUgc2VyaWFsaXplZCB3aGVuIHBhc3NlZCkqL1xuICAgIHRzdmZzLFxuICAgIC8qKiBHZXQgYWxsIHRoZSBkaWZmZXJlbnQgZW1pdHRlZCBmaWxlcyBhZnRlciBUeXBlU2NyaXB0IGlzIHJ1biAqL1xuICAgIGdldEVtaXRSZXN1bHQsXG4gICAgLyoqIEdldHMganVzdCB0aGUgSmF2YVNjcmlwdCBmb3IgeW91ciBzYW5kYm94LCB3aWxsIHRyYW5zcGlsZSBpZiBpbiBUUyBvbmx5ICovXG4gICAgZ2V0UnVubmFibGVKUyxcbiAgICAvKiogR2V0cyB0aGUgRFRTIG91dHB1dCBvZiB0aGUgbWFpbiBjb2RlIGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREVFNGb3JDb2RlLFxuICAgIC8qKiBUaGUgbW9uYWNvLWVkaXRvciBkb20gbm9kZSwgdXNlZCBmb3Igc2hvd2luZy9oaWRpbmcgdGhlIGVkaXRvciAqL1xuICAgIGdldERvbU5vZGUsXG4gICAgLyoqIFRoZSBtb2RlbCBpcyBhbiBvYmplY3Qgd2hpY2ggbW9uYWNvIHVzZXMgdG8ga2VlcCB0cmFjayBvZiB0ZXh0IGluIHRoZSBlZGl0b3IuIFVzZSB0aGlzIHRvIGRpcmVjdGx5IG1vZGlmeSB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0TW9kZWwsXG4gICAgLyoqIEdldHMgdGhlIHRleHQgb2YgdGhlIG1haW4gbW9kZWwsIHdoaWNoIGlzIHRoZSB0ZXh0IGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXRUZXh0LFxuICAgIC8qKiBTaG9ydGN1dCBmb3Igc2V0dGluZyB0aGUgbW9kZWwncyB0ZXh0IGNvbnRlbnQgd2hpY2ggd291bGQgdXBkYXRlIHRoZSBlZGl0b3IgKi9cbiAgICBzZXRUZXh0LFxuICAgIC8qKiBHZXRzIHRoZSBBU1Qgb2YgdGhlIGN1cnJlbnQgdGV4dCBpbiBtb25hY28gLSB1c2VzIGBjcmVhdGVUU1Byb2dyYW1gLCBzbyB0aGUgcGVyZm9ybWFuY2UgY2F2ZWF0IGFwcGxpZXMgdGhlcmUgdG9vICovXG4gICAgZ2V0QVNULFxuICAgIC8qKiBUaGUgbW9kdWxlIHlvdSBnZXQgZnJvbSByZXF1aXJlKFwidHlwZXNjcmlwdFwiKSAqL1xuICAgIHRzLFxuICAgIC8qKiBDcmVhdGUgYSBuZXcgUHJvZ3JhbSwgYSBUeXBlU2NyaXB0IGRhdGEgbW9kZWwgd2hpY2ggcmVwcmVzZW50cyB0aGUgZW50aXJlIHByb2plY3QuIEFzIHdlbGwgYXMgc29tZSBvZiB0aGVcbiAgICAgKiBwcmltaXRpdmUgb2JqZWN0cyB5b3Ugd291bGQgbm9ybWFsbHkgbmVlZCB0byBkbyB3b3JrIHdpdGggdGhlIGZpbGVzLlxuICAgICAqXG4gICAgICogVGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBjYWxsZWQgaXQgaGFzIHRvIGRvd25sb2FkIGFsbCB0aGUgRFRTIGZpbGVzIHdoaWNoIGlzIG5lZWRlZCBmb3IgYW4gZXhhY3QgY29tcGlsZXIgcnVuLiBXaGljaFxuICAgICAqIGF0IG1heCBpcyBhYm91dCAxLjVNQiAtIGFmdGVyIHRoYXQgc3Vic2VxdWVudCBkb3dubG9hZHMgb2YgZHRzIGxpYiBmaWxlcyBjb21lIGZyb20gbG9jYWxTdG9yYWdlLlxuICAgICAqXG4gICAgICogVHJ5IHRvIHVzZSB0aGlzIHNwYXJpbmdseSBhcyBpdCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGV4cGVuc2l2ZSwgYXQgdGhlIG1pbmltdW0geW91IHNob3VsZCBiZSB1c2luZyB0aGUgZGVib3VuY2VkIHNldHVwLlxuICAgICAqXG4gICAgICogQWNjZXB0cyBhbiBvcHRpb25hbCBmc01hcCB3aGljaCB5b3UgY2FuIHVzZSB0byBhZGQgYW55IGZpbGVzLCBvciBvdmVyd3JpdGUgdGhlIGRlZmF1bHQgZmlsZS5cbiAgICAgKlxuICAgICAqIFRPRE86IEl0IHdvdWxkIGJlIGdvb2QgdG8gY3JlYXRlIGFuIGVhc3kgd2F5IHRvIGhhdmUgYSBzaW5nbGUgcHJvZ3JhbSBpbnN0YW5jZSB3aGljaCBpcyB1cGRhdGVkIGZvciB5b3VcbiAgICAgKiB3aGVuIHRoZSBtb25hY28gbW9kZWwgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBzZXR1cFRTVkZTLFxuICAgIC8qKiBVc2VzIHRoZSBhYm92ZSBjYWxsIHNldHVwVFNWRlMsIGJ1dCBvbmx5IHJldHVybnMgdGhlIHByb2dyYW0gKi9cbiAgICBjcmVhdGVUU1Byb2dyYW0sXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgZGVmYXVsdCBjb21waWxlciBvcHRpb25zICAqL1xuICAgIGNvbXBpbGVyRGVmYXVsdHMsXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgY3VycmVudCBjb21waWxlciBvcHRpb25zICovXG4gICAgZ2V0Q29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBSZXBsYWNlIHRoZSBTYW5kYm94J3MgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIHNldENvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIE92ZXJ3cml0ZSB0aGUgU2FuZGJveCdzIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmcsXG4gICAgLyoqIFVwZGF0ZSBhIHNpbmdsZSBjb21waWxlciBvcHRpb24gaW4gdGhlIFNBbmRib3ggKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBBIHdheSB0byBnZXQgY2FsbGJhY2tzIHdoZW4gY29tcGlsZXIgc2V0dGluZ3MgaGF2ZSBjaGFuZ2VkICovXG4gICAgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogQSBjb3B5IG9mIGx6c3RyaW5nLCB3aGljaCBpcyB1c2VkIHRvIGFyY2hpdmUvdW5hcmNoaXZlIGNvZGUgKi9cbiAgICBsenN0cmluZyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGZvdW5kIGluIHRoZSBwYXJhbXMgb2YgdGhlIGN1cnJlbnQgcGFnZSAqL1xuICAgIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgYGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zYCBpbnN0ZWFkLlxuICAgICAqXG4gICAgICogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGluIHRoZSBzb3VyY2UgY29kZSB1c2luZyB0d29zbGFzaCBub3RhdGlvblxuICAgICAqL1xuICAgIGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zOiBnZXRUd29TbGFzaENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGluIHRoZSBzb3VyY2UgY29kZSB1c2luZyB0d29zbGFzaCBub3RhdGlvbiAqL1xuICAgIGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBHZXRzIHRvIHRoZSBjdXJyZW50IG1vbmFjby1sYW5ndWFnZSwgdGhpcyBpcyBob3cgeW91IHRhbGsgdG8gdGhlIGJhY2tncm91bmQgd2Vid29ya2VycyAqL1xuICAgIGxhbmd1YWdlU2VydmljZURlZmF1bHRzOiBkZWZhdWx0cyxcbiAgICAvKiogVGhlIHBhdGggd2hpY2ggcmVwcmVzZW50cyB0aGUgY3VycmVudCBmaWxlIHVzaW5nIHRoZSBjdXJyZW50IGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBmaWxlcGF0aDogZmlsZVBhdGgucGF0aCxcbiAgICAvKiogQWRkcyBhIGZpbGUgdG8gdGhlIHZmcyB1c2VkIGJ5IHRoZSBlZGl0b3IgKi9cbiAgICBhZGRMaWJyYXJ5VG9SdW50aW1lLFxuICB9XG59XG5cbmV4cG9ydCB0eXBlIFNhbmRib3ggPSBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveD5cbiJdfQ==