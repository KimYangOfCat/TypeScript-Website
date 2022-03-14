var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./createElements", "./sidebar/runtime", "./exporter", "./createUI", "./getExample", "./monaco/ExampleHighlight", "./createConfigDropdown", "./sidebar/plugins", "./pluginUtils", "./sidebar/settings", "./navigation", "./twoslashInlays"], function (require, exports, createElements_1, runtime_1, exporter_1, createUI_1, getExample_1, ExampleHighlight_1, createConfigDropdown_1, plugins_1, pluginUtils_1, settings_1, navigation_1, twoslashInlays_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupPlayground = void 0;
    const setupPlayground = (sandbox, monaco, config, i, react) => {
        const playgroundParent = sandbox.getDomNode().parentElement.parentElement.parentElement;
        // UI to the left
        const leftNav = (0, createElements_1.createNavigationSection)();
        playgroundParent.insertBefore(leftNav, sandbox.getDomNode().parentElement.parentElement);
        const dragBarLeft = (0, createElements_1.createDragBar)("left");
        playgroundParent.insertBefore(dragBarLeft, sandbox.getDomNode().parentElement.parentElement);
        const showNav = () => {
            const right = document.getElementsByClassName("playground-sidebar").item(0);
            const middle = document.getElementById("editor-container");
            middle.style.width = `calc(100% - ${right.clientWidth + 210}px)`;
            leftNav.style.display = "block";
            leftNav.style.width = "210px";
            leftNav.style.minWidth = "210px";
            leftNav.style.maxWidth = "210px";
            dragBarLeft.style.display = "block";
        };
        const hideNav = () => {
            leftNav.style.display = "none";
            dragBarLeft.style.display = "none";
        };
        hideNav();
        // UI to the right
        const dragBar = (0, createElements_1.createDragBar)("right");
        playgroundParent.appendChild(dragBar);
        const sidebar = (0, createElements_1.createSidebar)();
        playgroundParent.appendChild(sidebar);
        const tabBar = (0, createElements_1.createTabBar)();
        sidebar.appendChild(tabBar);
        const container = (0, createElements_1.createPluginContainer)();
        sidebar.appendChild(container);
        const plugins = [];
        const tabs = [];
        // Let's things like the workbench hook into tab changes
        let didUpdateTab;
        const registerPlugin = (plugin) => {
            plugins.push(plugin);
            const tab = (0, createElements_1.createTabForPlugin)(plugin);
            tabs.push(tab);
            const tabClicked = e => {
                const previousPlugin = getCurrentPlugin();
                let newTab = e.target;
                // It could be a notification you clicked on
                if (newTab.tagName === "DIV")
                    newTab = newTab.parentElement;
                const newPlugin = plugins.find(p => `playground-plugin-tab-${p.id}` == newTab.id);
                (0, createElements_1.activatePlugin)(newPlugin, previousPlugin, sandbox, tabBar, container);
                didUpdateTab && didUpdateTab(newPlugin, previousPlugin);
            };
            tabBar.appendChild(tab);
            tab.onclick = tabClicked;
        };
        const setDidUpdateTab = (func) => {
            didUpdateTab = func;
        };
        const getCurrentPlugin = () => {
            const selectedTab = tabs.find(t => t.classList.contains("active"));
            return plugins[tabs.indexOf(selectedTab)];
        };
        const defaultPlugins = config.plugins || (0, settings_1.getPlaygroundPlugins)();
        const utils = (0, pluginUtils_1.createUtils)(sandbox, react);
        const initialPlugins = defaultPlugins.map(f => f(i, utils));
        initialPlugins.forEach(p => registerPlugin(p));
        // Choose which should be selected
        const priorityPlugin = plugins.find(plugin => plugin.shouldBeSelected && plugin.shouldBeSelected());
        const selectedPlugin = priorityPlugin || plugins[0];
        const selectedTab = tabs[plugins.indexOf(selectedPlugin)];
        selectedTab.onclick({ target: selectedTab });
        let debouncingTimer = false;
        sandbox.editor.onDidChangeModelContent(_event => {
            const plugin = getCurrentPlugin();
            if (plugin.modelChanged)
                plugin.modelChanged(sandbox, sandbox.getModel(), container);
            // This needs to be last in the function
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                playgroundDebouncedMainFunction();
                // Only call the plugin function once every 0.3s
                if (plugin.modelChangedDebounce && plugin.id === getCurrentPlugin().id) {
                    plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
                }
            }, 300);
        });
        // When there are multi-file playgrounds, we should show the implicit filename, ideally this would be
        // something more inline, but we can abuse the code lenses for now because they get their own line!
        sandbox.monaco.languages.registerCodeLensProvider(sandbox.language, {
            provideCodeLenses: function (model, token) {
                const lenses = !showFileCodeLens
                    ? []
                    : [
                        {
                            range: {
                                startLineNumber: 1,
                                startColumn: 1,
                                endLineNumber: 2,
                                endColumn: 1,
                            },
                            id: "implicit-filename-first",
                            command: {
                                id: "noop",
                                title: `// @filename: ${sandbox.filepath}`,
                            },
                        },
                    ];
                return { lenses, dispose: () => { } };
            },
        });
        let showFileCodeLens = false;
        // If you set this to true, then the next time the playground would
        // have set the user's hash it would be skipped - used for setting
        // the text in examples
        let suppressNextTextChangeForHashChange = false;
        // Sets the URL and storage of the sandbox string
        const playgroundDebouncedMainFunction = () => {
            showFileCodeLens = sandbox.getText().includes("// @filename");
            localStorage.setItem("sandbox-history", sandbox.getText());
        };
        sandbox.editor.onDidBlurEditorText(() => {
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                if (suppressNextTextChangeForHashChange) {
                    suppressNextTextChangeForHashChange = false;
                    return;
                }
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
        });
        // Keeps track of whether the project has been set up as an ESM module via a package.json
        let isESMMode = false;
        // When any compiler flags are changed, trigger a potential change to the URL
        sandbox.setDidUpdateCompilerSettings(() => __awaiter(void 0, void 0, void 0, function* () {
            playgroundDebouncedMainFunction();
            // @ts-ignore
            window.appInsights && window.appInsights.trackEvent({ name: "Compiler Settings changed" });
            const model = sandbox.editor.getModel();
            const plugin = getCurrentPlugin();
            if (model && plugin.modelChanged)
                plugin.modelChanged(sandbox, model, container);
            if (model && plugin.modelChangedDebounce)
                plugin.modelChangedDebounce(sandbox, model, container);
            const alwaysUpdateURL = !localStorage.getItem("disable-save-on-type");
            if (alwaysUpdateURL) {
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
            }
            // Add an outer package.json with 'module: type' and ensures all the
            // other settings are inline for ESM mode
            const moduleNumber = sandbox.getCompilerOptions().module || 0;
            const isESMviaModule = moduleNumber > 99 && moduleNumber < 200;
            const moduleResNumber = sandbox.getCompilerOptions().moduleResolution || 0;
            const isESMviaModuleRes = moduleResNumber > 2 && moduleResNumber < 100;
            if (isESMviaModule || isESMviaModuleRes) {
                if (isESMMode)
                    return;
                isESMMode = true;
                setTimeout(() => {
                    ui.flashInfo(i("play_esm_mode"));
                }, 300);
                const nextRes = moduleNumber === 199 ? 99 : 2;
                sandbox.setCompilerSettings({ target: 99, moduleResolution: nextRes });
                sandbox.addLibraryToRuntime(JSON.stringify({ name: "playground", type: "module" }), "/package.json");
            }
        }));
        const skipInitiallySettingHash = document.location.hash && document.location.hash.includes("example/");
        if (!skipInitiallySettingHash)
            playgroundDebouncedMainFunction();
        // Setup working with the existing UI, once it's loaded
        // Versions of TypeScript
        // Set up the label for the dropdown
        const versionButton = document.querySelectorAll("#versions > a").item(0);
        versionButton.innerHTML = "v" + sandbox.ts.version + " <span class='caret'/>";
        versionButton.setAttribute("aria-label", `Select version of TypeScript, currently ${sandbox.ts.version}`);
        // Add the versions to the dropdown
        const versionsMenu = document.querySelectorAll("#versions > ul").item(0);
        // Enable all submenus
        document.querySelectorAll("nav ul li").forEach(e => e.classList.add("active"));
        const notWorkingInPlayground = ["3.1.6", "3.0.1", "2.8.1", "2.7.2", "2.4.1"];
        const allVersions = [...sandbox.supportedVersions.filter(f => !notWorkingInPlayground.includes(f)), "Nightly"];
        allVersions.forEach((v) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = v;
            a.href = "#";
            if (v === "Nightly") {
                li.classList.add("nightly");
            }
            if (v.toLowerCase().includes("beta")) {
                li.classList.add("beta");
            }
            li.onclick = () => {
                const currentURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const params = new URLSearchParams(currentURL.split("#")[0]);
                const version = v === "Nightly" ? "next" : v;
                params.set("ts", version);
                const hash = document.location.hash.length ? document.location.hash : "";
                const newURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}?${params}${hash}`;
                // @ts-ignore - it is allowed
                document.location = newURL;
            };
            li.appendChild(a);
            versionsMenu.appendChild(li);
        });
        // Support dropdowns
        document.querySelectorAll(".navbar-sub li.dropdown > a").forEach(link => {
            const a = link;
            a.onclick = _e => {
                if (a.parentElement.classList.contains("open")) {
                    escapePressed();
                }
                else {
                    escapePressed();
                    a.parentElement.classList.toggle("open");
                    a.setAttribute("aria-expanded", "true");
                    const exampleContainer = a.closest("li").getElementsByTagName("ul").item(0);
                    if (!exampleContainer)
                        return;
                    const firstLabel = exampleContainer.querySelector("label");
                    if (firstLabel)
                        firstLabel.focus();
                    // Set exact height and widths for the popovers for the main playground navigation
                    const isPlaygroundSubmenu = !!a.closest("nav");
                    if (isPlaygroundSubmenu) {
                        const playgroundContainer = document.getElementById("playground-container");
                        exampleContainer.style.height = `calc(${playgroundContainer.getBoundingClientRect().height + 26}px - 4rem)`;
                        const sideBarWidth = document.querySelector(".playground-sidebar").offsetWidth;
                        exampleContainer.style.width = `calc(100% - ${sideBarWidth}px - 71px)`;
                        // All this is to make sure that tabbing stays inside the dropdown for tsconfig/examples
                        const buttons = exampleContainer.querySelectorAll("input");
                        const lastButton = buttons.item(buttons.length - 1);
                        if (lastButton) {
                            redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                        }
                        else {
                            const sections = document.querySelectorAll("ul.examples-dropdown .section-content");
                            sections.forEach(s => {
                                const buttons = s.querySelectorAll("a.example-link");
                                const lastButton = buttons.item(buttons.length - 1);
                                if (lastButton) {
                                    redirectTabPressTo(lastButton, exampleContainer, ".examples-close");
                                }
                            });
                        }
                    }
                }
                return false;
            };
        });
        /** Handles removing the dropdowns like tsconfig/examples/handbook */
        const escapePressed = () => {
            document.querySelectorAll(".navbar-sub li.open").forEach(i => i.classList.remove("open"));
            document.querySelectorAll(".navbar-sub li").forEach(i => i.setAttribute("aria-expanded", "false"));
            (0, navigation_1.hideNavForHandbook)(sandbox);
        };
        // Handle escape closing dropdowns etc
        document.onkeydown = function (evt) {
            evt = evt || window.event;
            var isEscape = false;
            if ("key" in evt) {
                isEscape = evt.key === "Escape" || evt.key === "Esc";
            }
            else {
                // @ts-ignore - this used to be the case
                isEscape = evt.keyCode === 27;
            }
            if (isEscape)
                escapePressed();
        };
        const shareAction = {
            id: "copy-clipboard",
            label: "Save to clipboard",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            contextMenuGroupId: "run",
            contextMenuOrder: 1.5,
            run: function () {
                // Update the URL, then write that to the clipboard
                const newURL = sandbox.createURLQueryWithCompilerOptions(sandbox);
                window.history.replaceState({}, "", newURL);
                window.navigator.clipboard.writeText(location.href.toString()).then(() => ui.flashInfo(i("play_export_clipboard")), (e) => alert(e));
            },
        };
        const shareButton = document.getElementById("share-button");
        if (shareButton) {
            shareButton.onclick = e => {
                e.preventDefault();
                shareAction.run();
                return false;
            };
            // Set up some key commands
            sandbox.editor.addAction(shareAction);
            sandbox.editor.addAction({
                id: "run-js",
                label: "Run the evaluated JavaScript for your TypeScript file",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                contextMenuGroupId: "run",
                contextMenuOrder: 1.5,
                run: function (ed) {
                    const runButton = document.getElementById("run-button");
                    runButton && runButton.onclick && runButton.onclick({});
                },
            });
        }
        const runButton = document.getElementById("run-button");
        if (runButton) {
            runButton.onclick = () => {
                const run = sandbox.getRunnableJS();
                const runPlugin = plugins.find(p => p.id === "logs");
                (0, createElements_1.activatePlugin)(runPlugin, getCurrentPlugin(), sandbox, tabBar, container);
                (0, runtime_1.runWithCustomLogs)(run, i);
                const isJS = sandbox.config.filetype === "js";
                ui.flashInfo(i(isJS ? "play_run_js" : "play_run_ts"));
                return false;
            };
        }
        // Handle the close buttons on the examples
        document.querySelectorAll("button.examples-close").forEach(b => {
            const button = b;
            button.onclick = escapePressed;
        });
        // Support clicking the handbook button on the top nav
        const handbookButton = document.getElementById("handbook-button");
        if (handbookButton) {
            handbookButton.onclick = () => {
                // Two potentially concurrent sidebar navs is just a bit too much
                // state to keep track of ATM
                if (!handbookButton.parentElement.classList.contains("active")) {
                    ui.flashInfo("Cannot open the Playground handbook when in a Gist");
                    return;
                }
                const showingHandbook = handbookButton.parentElement.classList.contains("open");
                if (!showingHandbook) {
                    escapePressed();
                    showNav();
                    handbookButton.parentElement.classList.add("open");
                    (0, navigation_1.showNavForHandbook)(sandbox, escapePressed);
                }
                else {
                    escapePressed();
                }
                return false;
            };
        }
        (0, createElements_1.setupSidebarToggle)();
        if (document.getElementById("config-container")) {
            (0, createConfigDropdown_1.createConfigDropdown)(sandbox, monaco);
            (0, createConfigDropdown_1.updateConfigDropdownForCompilerOptions)(sandbox, monaco);
        }
        if (document.getElementById("playground-settings")) {
            const settingsToggle = document.getElementById("playground-settings");
            settingsToggle.onclick = () => {
                const open = settingsToggle.parentElement.classList.contains("open");
                const sidebarTabs = document.querySelector(".playground-plugin-tabview");
                const sidebarContent = document.querySelector(".playground-plugin-container");
                let settingsContent = document.querySelector(".playground-settings-container");
                if (!settingsContent) {
                    settingsContent = document.createElement("div");
                    settingsContent.className = "playground-settings-container playground-plugin-container";
                    const settings = (0, settings_1.settingsPlugin)(i, utils);
                    settings.didMount && settings.didMount(sandbox, settingsContent);
                    document.querySelector(".playground-sidebar").appendChild(settingsContent);
                    // When the last tab item is hit, go back to the settings button
                    const labels = document.querySelectorAll(".playground-sidebar input");
                    const lastLabel = labels.item(labels.length - 1);
                    if (lastLabel) {
                        redirectTabPressTo(lastLabel, undefined, "#playground-settings");
                    }
                }
                if (open) {
                    sidebarTabs.style.display = "flex";
                    sidebarContent.style.display = "block";
                    settingsContent.style.display = "none";
                }
                else {
                    sidebarTabs.style.display = "none";
                    sidebarContent.style.display = "none";
                    settingsContent.style.display = "block";
                    document.querySelector(".playground-sidebar label").focus();
                }
                settingsToggle.parentElement.classList.toggle("open");
            };
            settingsToggle.addEventListener("keydown", e => {
                const isOpen = settingsToggle.parentElement.classList.contains("open");
                if (e.key === "Tab" && isOpen) {
                    const result = document.querySelector(".playground-options li input");
                    result.focus();
                    e.preventDefault();
                }
            });
        }
        // Support grabbing examples from the location hash
        if (location.hash.startsWith("#example")) {
            const exampleName = location.hash.replace("#example/", "").trim();
            sandbox.config.logger.log("Loading example:", exampleName);
            (0, getExample_1.getExampleSourceCode)(config.prefix, config.lang, exampleName).then(ex => {
                if (ex.example && ex.code) {
                    const { example, code } = ex;
                    // Update the localstorage showing that you've seen this page
                    if (localStorage) {
                        const seenText = localStorage.getItem("examples-seen") || "{}";
                        const seen = JSON.parse(seenText);
                        seen[example.id] = example.hash;
                        localStorage.setItem("examples-seen", JSON.stringify(seen));
                    }
                    const allLinks = document.querySelectorAll("example-link");
                    // @ts-ignore
                    for (const link of allLinks) {
                        if (link.textContent === example.title) {
                            link.classList.add("highlight");
                        }
                    }
                    document.title = "TypeScript Playground - " + example.title;
                    suppressNextTextChangeForHashChange = true;
                    sandbox.setText(code);
                }
                else {
                    suppressNextTextChangeForHashChange = true;
                    sandbox.setText("// There was an issue getting the example, bad URL? Check the console in the developer tools");
                }
            });
        }
        // Set the errors number in the sidebar tabs
        const model = sandbox.getModel();
        model.onDidChangeDecorations(() => {
            const markers = sandbox.monaco.editor.getModelMarkers({ resource: model.uri }).filter(m => m.severity !== 1);
            utils.setNotifications("errors", markers.length);
        });
        // Sets up a way to click between examples
        monaco.languages.registerLinkProvider(sandbox.language, new ExampleHighlight_1.ExampleHighlighter());
        const languageSelector = document.getElementById("language-selector");
        if (languageSelector) {
            const params = new URLSearchParams(location.search);
            const options = ["ts", "d.ts", "js"];
            languageSelector.options.selectedIndex = options.indexOf(params.get("filetype") || "ts");
            languageSelector.onchange = () => {
                const filetype = options[Number(languageSelector.selectedIndex || 0)];
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox, { filetype });
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                // @ts-ignore
                document.location = fullURL;
            };
        }
        // Ensure that the editor is full-width when the screen resizes
        window.addEventListener("resize", () => {
            sandbox.editor.layout();
        });
        const ui = (0, createUI_1.createUI)();
        const exporter = (0, exporter_1.createExporter)(sandbox, monaco, ui);
        const playground = {
            exporter,
            ui,
            registerPlugin,
            plugins,
            getCurrentPlugin,
            tabs,
            setDidUpdateTab,
            createUtils: pluginUtils_1.createUtils,
        };
        window.ts = sandbox.ts;
        window.sandbox = sandbox;
        window.playground = playground;
        console.log(`Using TypeScript ${window.ts.version}`);
        console.log("Available globals:");
        console.log("\twindow.ts", window.ts);
        console.log("\twindow.sandbox", window.sandbox);
        console.log("\twindow.playground", window.playground);
        console.log("\twindow.react", window.react);
        console.log("\twindow.reactDOM", window.reactDOM);
        /** The plugin system */
        const activateExternalPlugin = (plugin, autoActivate) => {
            let readyPlugin;
            // Can either be a factory, or object
            if (typeof plugin === "function") {
                const utils = (0, pluginUtils_1.createUtils)(sandbox, react);
                readyPlugin = plugin(utils);
            }
            else {
                readyPlugin = plugin;
            }
            if (autoActivate) {
                console.log(readyPlugin);
            }
            playground.registerPlugin(readyPlugin);
            // Auto-select the dev plugin
            const pluginWantsFront = readyPlugin.shouldBeSelected && readyPlugin.shouldBeSelected();
            if (pluginWantsFront || autoActivate) {
                // Auto-select the dev plugin
                (0, createElements_1.activatePlugin)(readyPlugin, getCurrentPlugin(), sandbox, tabBar, container);
            }
        };
        // Dev mode plugin
        if (config.supportCustomPlugins && (0, plugins_1.allowConnectingToLocalhost)()) {
            window.exports = {};
            console.log("Connecting to dev plugin");
            try {
                // @ts-ignore
                const re = window.require;
                re(["local/index"], (devPlugin) => {
                    console.log("Set up dev plugin from localhost:5000");
                    try {
                        activateExternalPlugin(devPlugin, true);
                    }
                    catch (error) {
                        console.error(error);
                        setTimeout(() => {
                            ui.flashInfo("Error: Could not load dev plugin from localhost:5000");
                        }, 700);
                    }
                });
            }
            catch (error) {
                console.error("Problem loading up the dev plugin");
                console.error(error);
            }
        }
        const downloadPlugin = (plugin, autoEnable) => {
            try {
                // @ts-ignore
                const re = window.require;
                re([`unpkg/${plugin}@latest/dist/index`], (devPlugin) => {
                    activateExternalPlugin(devPlugin, autoEnable);
                });
            }
            catch (error) {
                console.error("Problem loading up the plugin:", plugin);
                console.error(error);
            }
        };
        if (config.supportCustomPlugins) {
            // Grab ones from localstorage
            (0, plugins_1.activePlugins)().forEach(p => downloadPlugin(p.id, false));
            // Offer to install one if 'install-plugin' is a query param
            const params = new URLSearchParams(location.search);
            const pluginToInstall = params.get("install-plugin");
            if (pluginToInstall) {
                const alreadyInstalled = (0, plugins_1.activePlugins)().find(p => p.id === pluginToInstall);
                if (!alreadyInstalled) {
                    const shouldDoIt = confirm("Would you like to install the third party plugin?\n\n" + pluginToInstall);
                    if (shouldDoIt) {
                        (0, plugins_1.addCustomPlugin)(pluginToInstall);
                        downloadPlugin(pluginToInstall, true);
                    }
                }
            }
        }
        const [tsMajor, tsMinor] = sandbox.ts.version.split(".");
        if ((parseInt(tsMajor) > 4 || (parseInt(tsMajor) == 4 && parseInt(tsMinor) >= 6)) &&
            monaco.languages.registerInlayHintsProvider) {
            monaco.languages.registerInlayHintsProvider(sandbox.language, (0, twoslashInlays_1.createTwoslashInlayProvider)(sandbox));
        }
        if (location.hash.startsWith("#show-examples")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("examples-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        if (location.hash.startsWith("#show-whatisnew")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("whatisnew-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        // Grab the contents of a Gist
        if (location.hash.startsWith("#gist/")) {
            (0, navigation_1.gistPoweredNavBar)(sandbox, ui, showNav);
        }
        // Auto-load into the playground
        if (location.hash.startsWith("#handbook")) {
            setTimeout(() => {
                var _a;
                (_a = document.getElementById("handbook-button")) === null || _a === void 0 ? void 0 : _a.click();
            }, 100);
        }
        return playground;
    };
    exports.setupPlayground = setupPlayground;
    const redirectTabPressTo = (element, container, query) => {
        element.addEventListener("keydown", e => {
            if (e.key === "Tab") {
                const host = container || document;
                const result = host.querySelector(query);
                if (!result)
                    throw new Error(`Expected to find a result for keydown`);
                result.focus();
                e.preventDefault();
            }
        });
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0lBeUVPLE1BQU0sZUFBZSxHQUFHLENBQzdCLE9BQWdCLEVBQ2hCLE1BQWMsRUFDZCxNQUF3QixFQUN4QixDQUEwQixFQUMxQixLQUFtQixFQUNuQixFQUFFO1FBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsYUFBYyxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUE7UUFFMUYsaUJBQWlCO1FBQ2pCLE1BQU0sT0FBTyxHQUFHLElBQUEsd0NBQXVCLEdBQUUsQ0FBQTtRQUN6QyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxhQUFjLENBQUMsYUFBYyxDQUFDLENBQUE7UUFFMUYsTUFBTSxXQUFXLEdBQUcsSUFBQSw4QkFBYSxFQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLGFBQWMsQ0FBQyxhQUFjLENBQUMsQ0FBQTtRQUU5RixNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUU7WUFDbkIsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBRSxDQUFBO1lBQzVFLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUUsQ0FBQTtZQUMzRCxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLEtBQUssQ0FBQyxXQUFXLEdBQUcsR0FBRyxLQUFLLENBQUE7WUFFaEUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1lBQy9CLE9BQU8sQ0FBQyxLQUFL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QUE7SUF4cUJZLFFBQUEsZUFBZSxtQkF3cUIzQjtJQUlELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxPQUFvQixFQUFFLFNBQWtDLEVBQUUsS0FBYSxFQUFFLEVBQUU7UUFDckcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsRUFBRTtZQUN0QyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssS0FBSyxFQUFFO2dCQUNuQixNQUFNLElBQUksR0FBRyxTQUFTLElBQUksUUFBUSxDQUFBO2dCQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBUSxDQUFBO2dCQUMvQyxJQUFJLENBQUMsTUFBTTtvQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxDQUFDLENBQUE7Z0JBQ3JFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDZCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7YUFDbkI7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbInR5cGUgU2FuZGJveCA9IGltcG9ydChcIkB0eXBlc2NyaXB0L3NhbmRib3hcIikuU2FuZGJveFxudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKVxuXG5kZWNsYXJlIGNvbnN0IHdpbmRvdzogYW55XG5cbmltcG9ydCB7XG4gIGNyZWF0ZVNpZGViYXIsXG4gIGNyZWF0ZVRhYkZvclBsdWdpbixcbiAgY3JlYXRlVGFiQmFyLFxuICBjcmVhdGVQbHVnaW5Db250YWluZXIsXG4gIGFjdGl2YXRlUGx1Z2luLFxuICBjcmVhdGVEcmFnQmFyLFxuICBzZXR1cFNpZGViYXJUb2dnbGUsXG4gIGNyZWF0ZU5hdmlnYXRpb25TZWN0aW9uLFxufSBmcm9tIFwiLi9jcmVhdGVFbGVtZW50c1wiXG5pbXBvcnQgeyBydW5XaXRoQ3VzdG9tTG9ncyB9IGZyb20gXCIuL3NpZGViYXIvcnVudGltZVwiXG5pbXBvcnQgeyBjcmVhdGVFeHBvcnRlciB9IGZyb20gXCIuL2V4cG9ydGVyXCJcbmltcG9ydCB7IGNyZWF0ZVVJIH0gZnJvbSBcIi4vY3JlYXRlVUlcIlxuaW1wb3J0IHsgZ2V0RXhhbXBsZVNvdXJjZUNvZGUgfSBmcm9tIFwiLi9nZXRFeGFtcGxlXCJcbmltcG9ydCB7IEV4YW1wbGVIaWdobGlnaHRlciB9IGZyb20gXCIuL21vbmFjby9FeGFtcGxlSGlnaGxpZ2h0XCJcbmltcG9ydCB7IGNyZWF0ZUNvbmZpZ0Ryb3Bkb3duLCB1cGRhdGVDb25maWdEcm9wZG93bkZvckNvbXBpbGVyT3B0aW9ucyB9IGZyb20gXCIuL2NyZWF0ZUNvbmZpZ0Ryb3Bkb3duXCJcbmltcG9ydCB7IGFsbG93Q29ubmVjdGluZ1RvTG9jYWxob3N0LCBhY3RpdmVQbHVnaW5zLCBhZGRDdXN0b21QbHVnaW4gfSBmcm9tIFwiLi9zaWRlYmFyL3BsdWdpbnNcIlxuaW1wb3J0IHsgY3JlYXRlVXRpbHMsIFBsdWdpblV0aWxzIH0gZnJvbSBcIi4vcGx1Z2luVXRpbHNcIlxuaW1wb3J0IHR5cGUgUmVhY3QgZnJvbSBcInJlYWN0XCJcbmltcG9ydCB7IHNldHRpbmdzUGx1Z2luLCBnZXRQbGF5Z3JvdW5kUGx1Z2lucyB9IGZyb20gXCIuL3NpZGViYXIvc2V0dGluZ3NcIlxuaW1wb3J0IHsgZ2lzdFBvd2VyZWROYXZCYXIsIGhpZGVOYXZGb3JIYW5kYm9vaywgc2hvd05hdkZvckhhbmRib29rIH0gZnJvbSBcIi4vbmF2aWdhdGlvblwiXG5pbXBvcnQgeyBjcmVhdGVUd29zbGFzaElubGF5UHJvdmlkZXIgfSBmcm9tIFwiLi90d29zbGFzaElubGF5c1wiXG5cbmV4cG9ydCB7IFBsdWdpblV0aWxzIH0gZnJvbSBcIi4vcGx1Z2luVXRpbHNcIlxuXG5leHBvcnQgdHlwZSBQbHVnaW5GYWN0b3J5ID0ge1xuICAoaTogKGtleTogc3RyaW5nLCBjb21wb25lbnRzPzogYW55KSA9PiBzdHJpbmcsIHV0aWxzOiBQbHVnaW5VdGlscyk6IFBsYXlncm91bmRQbHVnaW5cbn1cblxuLyoqIFRoZSBpbnRlcmZhY2Ugb2YgYWxsIHNpZGViYXIgcGx1Z2lucyAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGF5Z3JvdW5kUGx1Z2luIHtcbiAgLyoqIE5vdCBwdWJsaWMgZmFjaW5nLCBidXQgdXNlZCBieSB0aGUgcGxheWdyb3VuZCB0byB1bmlxdWVseSBpZGVudGlmeSBwbHVnaW5zICovXG4gIGlkOiBzdHJpbmdcbiAgLyoqIFRvIHNob3cgaW4gdGhlIHRhYnMgKi9cbiAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICAvKiogU2hvdWxkIHRoaXMgcGx1Z2luIGJlIHNlbGVjdGVkIHdoZW4gdGhlIHBsdWdpbiBpcyBmaXJzdCBsb2FkZWQ/IExldHMgeW91IGNoZWNrIGZvciBxdWVyeSB2YXJzIGV0YyB0byBsb2FkIGEgcGFydGljdWxhciBwbHVnaW4gKi9cbiAgc2hvdWxkQmVTZWxlY3RlZD86ICgpID0+IGJvb2xlYW5cbiAgLyoqIEJlZm9yZSB3ZSBzaG93IHRoZSB0YWIsIHVzZSB0aGlzIHRvIHNldCB1cCB5b3VyIEhUTUwgLSBpdCB3aWxsIGFsbCBiZSByZW1vdmVkIGJ5IHRoZSBwbGF5Z3JvdW5kIHdoZW4gc29tZW9uZSBuYXZpZ2F0ZXMgb2ZmIHRoZSB0YWIgKi9cbiAgd2lsbE1vdW50PzogKHNhbmRib3g6IFNhbmRib3gsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIEFmdGVyIHdlIHNob3cgdGhlIHRhYiAqL1xuICBkaWRNb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBNb2RlbCBjaGFuZ2VzIHdoaWxlIHRoaXMgcGx1Z2luIGlzIGFjdGl2ZWx5IHNlbGVjdGVkICAqL1xuICBtb2RlbENoYW5nZWQ/OiAoc2FuZGJveDogU2FuZGJveCwgbW9kZWw6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikuZWRpdG9yLklUZXh0TW9kZWwsIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnQpID0+IHZvaWRcbiAgLyoqIERlbGF5ZWQgbW9kZWwgY2hhbmdlcyB3aGlsZSB0aGlzIHBsdWdpbiBpcyBhY3RpdmVseSBzZWxlY3RlZCwgdXNlZnVsIHdoZW4geW91IGFyZSB3b3JraW5nIHdpdGggdGhlIFRTIEFQSSBiZWNhdXNlIGl0IHdvbid0IHJ1biBvbiBldmVyeSBrZXlwcmVzcyAqL1xuICBtb2RlbENoYW5nZWREZWJvdW5jZT86IChcbiAgICBzYW5kYm94OiBTYW5kYm94LFxuICAgIG1vZGVsOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JVGV4dE1vZGVsLFxuICAgIGNvbnRhaW5lcjogSFRNTERpdkVsZW1lbnRcbiAgKSA9PiB2b2lkXG4gIC8qKiBCZWZvcmUgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgd2lsbFVubW91bnQ/OiAoc2FuZGJveDogU2FuZGJveCwgY29udGFpbmVyOiBIVE1MRGl2RWxlbWVudCkgPT4gdm9pZFxuICAvKiogQWZ0ZXIgd2UgcmVtb3ZlIHRoZSB0YWIgKi9cbiAgZGlkVW5tb3VudD86IChzYW5kYm94OiBTYW5kYm94LCBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50KSA9PiB2b2lkXG4gIC8qKiBBbiBvYmplY3QgeW91IGNhbiB1c2UgdG8ga2VlcCBkYXRhIGFyb3VuZCBpbiB0aGUgc2NvcGUgb2YgeW91ciBwbHVnaW4gb2JqZWN0ICovXG4gIGRhdGE/OiBhbnlcbn1cblxuaW50ZXJmYWNlIFBsYXlncm91bmRDb25maWcge1xuICAvKiogTGFuZ3VhZ2UgbGlrZSBcImVuXCIgLyBcImphXCIgZXRjICovXG4gIGxhbmc6IHN0cmluZ1xuICAvKiogU2l0ZSBwcmVmaXgsIGxpa2UgXCJ2MlwiIGR1cmluZyB0aGUgcHJlLXJlbGVhc2UgKi9cbiAgcHJlZml4OiBzdHJpbmdcbiAgLyoqIE9wdGlvbmFsIHBsdWdpbnMgc28gdGhhdCB3ZSBjYW4gcmUtdXNlIHRoZSBwbGF5Z3JvdW5kIHdpdGggZGlmZmVyZW50IHNpZGViYXJzICovXG4gIHBsdWdpbnM/OiBQbHVnaW5GYWN0b3J5W11cbiAgLyoqIFNob3VsZCB0aGlzIHBsYXlncm91bmQgbG9hZCB1cCBjdXN0b20gcGx1Z2lucyBmcm9tIGxvY2FsU3RvcmFnZT8gKi9cbiAgc3VwcG9ydEN1c3RvbVBsdWdpbnM6IGJvb2xlYW5cbn1cblxuZXhwb3J0IGNvbnN0IHNldHVwUGxheWdyb3VuZCA9IChcbiAgc2FuZGJveDogU2FuZGJveCxcbiAgbW9uYWNvOiBNb25hY28sXG4gIGNvbmZpZzogUGxheWdyb3VuZENvbmZpZyxcbiAgaTogKGtleTogc3RyaW5nKSA9PiBzdHJpbmcsXG4gIHJlYWN0OiB0eXBlb2YgUmVhY3RcbikgPT4ge1xuICBjb25zdCBwbGF5Z3JvdW5kUGFyZW50ID0gc2FuZGJveC5nZXREb21Ob2RlKCkucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCEucGFyZW50RWxlbWVudCFcblxuICAvLyBVSSB0byB0aGUgbGVmdFxuICBjb25zdCBsZWZ0TmF2ID0gY3JlYXRlTmF2aWdhdGlvblNlY3Rpb24oKVxuICBwbGF5Z3JvdW5kUGFyZW50Lmluc2VydEJlZm9yZShsZWZ0TmF2LCBzYW5kYm94LmdldERvbU5vZGUoKS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50ISlcblxuICBjb25zdCBkcmFnQmFyTGVmdCA9IGNyZWF0ZURyYWdCYXIoXCJsZWZ0XCIpXG4gIHBsYXlncm91bmRQYXJlbnQuaW5zZXJ0QmVmb3JlKGRyYWdCYXJMZWZ0LCBzYW5kYm94LmdldERvbU5vZGUoKS5wYXJlbnRFbGVtZW50IS5wYXJlbnRFbGVtZW50ISlcblxuICBjb25zdCBzaG93TmF2ID0gKCkgPT4ge1xuICAgIGNvbnN0IHJpZ2h0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcInBsYXlncm91bmQtc2lkZWJhclwiKS5pdGVtKDApIVxuICAgIGNvbnN0IG1pZGRsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZWRpdG9yLWNvbnRhaW5lclwiKSFcbiAgICBtaWRkbGUuc3R5bGUud2lkdGggPSBgY2FsYygxMDAlIC0gJHtyaWdodC5jbGllbnRXaWR0aCArIDIxMH1weClgXG5cbiAgICBsZWZ0TmF2LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICBsZWZ0TmF2LnN0eWxlLndpZHRoID0gXCIyMTBweFwiXG4gICAgbGVmdE5hdi5zdHlsZS5taW5XaWR0aCA9IFwiMjEwcHhcIlxuICAgIGxlZnROYXYuc3R5bGUubWF4V2lkdGggPSBcIjIxMHB4XCJcbiAgICBkcmFnQmFyTGVmdC5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiXG4gIH1cbiAgY29uc3QgaGlkZU5hdiA9ICgpID0+IHtcbiAgICBsZWZ0TmF2LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgIGRyYWdCYXJMZWZ0LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICB9XG5cbiAgaGlkZU5hdigpXG5cbiAgLy8gVUkgdG8gdGhlIHJpZ2h0XG4gIGNvbnN0IGRyYWdCYXIgPSBjcmVhdGVEcmFnQmFyKFwicmlnaHRcIilcbiAgcGxheWdyb3VuZFBhcmVudC5hcHBlbmRDaGlsZChkcmFnQmFyKVxuXG4gIGNvbnN0IHNpZGViYXIgPSBjcmVhdGVTaWRlYmFyKClcbiAgcGxheWdyb3VuZFBhcmVudC5hcHBlbmRDaGlsZChzaWRlYmFyKVxuXG4gIGNvbnN0IHRhYkJhciA9IGNyZWF0ZVRhYkJhcigpXG4gIHNpZGViYXIuYXBwZW5kQ2hpbGQodGFiQmFyKVxuXG4gIGNvbnN0IGNvbnRhaW5lciA9IGNyZWF0ZVBsdWdpbkNvbnRhaW5lcigpXG4gIHNpZGViYXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyKVxuXG4gIGNvbnN0IHBsdWdpbnMgPSBbXSBhcyBQbGF5Z3JvdW5kUGx1Z2luW11cbiAgY29uc3QgdGFicyA9IFtdIGFzIEhUTUxCdXR0b25FbGVtZW50W11cblxuICAvLyBMZXQncyB0aGluZ3MgbGlrZSB0aGUgd29ya2JlbmNoIGhvb2sgaW50byB0YWIgY2hhbmdlc1xuICBsZXQgZGlkVXBkYXRlVGFiOiAobmV3UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luLCBwcmV2aW91c1BsdWdpbjogUGxheWdyb3VuZFBsdWdpbikgPT4gdm9pZCB8IHVuZGVmaW5lZFxuXG4gIGNvbnN0IHJlZ2lzdGVyUGx1Z2luID0gKHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbikgPT4ge1xuICAgIHBsdWdpbnMucHVzaChwbHVnaW4pXG5cbiAgICBjb25zdCB0YWIgPSBjcmVhdGVUYWJGb3JQbHVnaW4ocGx1Z2luKVxuXG4gICAgdGFicy5wdXNoKHRhYilcblxuICAgIGNvbnN0IHRhYkNsaWNrZWQ6IEhUTUxFbGVtZW50W1wib25jbGlja1wiXSA9IGUgPT4ge1xuICAgICAgY29uc3QgcHJldmlvdXNQbHVnaW4gPSBnZXRDdXJyZW50UGx1Z2luKClcbiAgICAgIGxldCBuZXdUYWIgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudFxuICAgICAgLy8gSXQgY291bGQgYmUgYSBub3RpZmljYXRpb24geW91IGNsaWNrZWQgb25cbiAgICAgIGlmIChuZXdUYWIudGFnTmFtZSA9PT0gXCJESVZcIikgbmV3VGFiID0gbmV3VGFiLnBhcmVudEVsZW1lbnQhXG4gICAgICBjb25zdCBuZXdQbHVnaW4gPSBwbHVnaW5zLmZpbmQocCA9PiBgcGxheWdyb3VuZC1wbHVnaW4tdGFiLSR7cC5pZH1gID09IG5ld1RhYi5pZCkhXG4gICAgICBhY3RpdmF0ZVBsdWdpbihuZXdQbHVnaW4sIHByZXZpb3VzUGx1Z2luLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcbiAgICAgIGRpZFVwZGF0ZVRhYiAmJiBkaWRVcGRhdGVUYWIobmV3UGx1Z2luLCBwcmV2aW91c1BsdWdpbilcbiAgICB9XG5cbiAgICB0YWJCYXIuYXBwZW5kQ2hpbGQodGFiKVxuICAgIHRhYi5vbmNsaWNrID0gdGFiQ2xpY2tlZFxuICB9XG5cbiAgY29uc3Qgc2V0RGlkVXBkYXRlVGFiID0gKGZ1bmM6IChuZXdQbHVnaW46IFBsYXlncm91bmRQbHVnaW4sIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB2b2lkKSA9PiB7XG4gICAgZGlkVXBkYXRlVGFiID0gZnVuY1xuICB9XG5cbiAgY29uc3QgZ2V0Q3VycmVudFBsdWdpbiA9ICgpID0+IHtcbiAgICBjb25zdCBzZWxlY3RlZFRhYiA9IHRhYnMuZmluZCh0ID0+IHQuY2xhc3NMaXN0LmNvbnRhaW5zKFwiYWN0aXZlXCIpKSFcbiAgICByZXR1cm4gcGx1Z2luc1t0YWJzLmluZGV4T2Yoc2VsZWN0ZWRUYWIpXVxuICB9XG5cbiAgY29uc3QgZGVmYXVsdFBsdWdpbnMgPSBjb25maWcucGx1Z2lucyB8fCBnZXRQbGF5Z3JvdW5kUGx1Z2lucygpXG4gIGNvbnN0IHV0aWxzID0gY3JlYXRlVXRpbHMoc2FuZGJveCwgcmVhY3QpXG4gIGNvbnN0IGluaXRpYWxQbHVnaW5zID0gZGVmYXVsdFBsdWdpbnMubWFwKGYgPT4gZihpLCB1dGlscykpXG4gIGluaXRpYWxQbHVnaW5zLmZvckVhY2gocCA9PiByZWdpc3RlclBsdWdpbihwKSlcblxuICAvLyBDaG9vc2Ugd2hpY2ggc2hvdWxkIGJlIHNlbGVjdGVkXG4gIGNvbnN0IHByaW9yaXR5UGx1Z2luID0gcGx1Z2lucy5maW5kKHBsdWdpbiA9PiBwbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiBwbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCgpKVxuICBjb25zdCBzZWxlY3RlZFBsdWdpbiA9IHByaW9yaXR5UGx1Z2luIHx8IHBsdWdpbnNbMF1cbiAgY29uc3Qgc2VsZWN0ZWRUYWIgPSB0YWJzW3BsdWdpbnMuaW5kZXhPZihzZWxlY3RlZFBsdWdpbildIVxuICBzZWxlY3RlZFRhYi5vbmNsaWNrISh7IHRhcmdldDogc2VsZWN0ZWRUYWIgfSBhcyBhbnkpXG5cbiAgbGV0IGRlYm91bmNpbmdUaW1lciA9IGZhbHNlXG4gIHNhbmRib3guZWRpdG9yLm9uRGlkQ2hhbmdlTW9kZWxDb250ZW50KF9ldmVudCA9PiB7XG4gICAgY29uc3QgcGx1Z2luID0gZ2V0Q3VycmVudFBsdWdpbigpXG4gICAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWQpIHBsdWdpbi5tb2RlbENoYW5nZWQoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpLCBjb250YWluZXIpXG5cbiAgICAvLyBUaGlzIG5lZWRzIHRvIGJlIGxhc3QgaW4gdGhlIGZ1bmN0aW9uXG4gICAgaWYgKGRlYm91bmNpbmdUaW1lcikgcmV0dXJuXG4gICAgZGVib3VuY2luZ1RpbWVyID0gdHJ1ZVxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZGVib3VuY2luZ1RpbWVyID0gZmFsc2VcbiAgICAgIHBsYXlncm91bmREZWJvdW5jZWRNYWluRnVuY3Rpb24oKVxuXG4gICAgICAvLyBPbmx5IGNhbGwgdGhlIHBsdWdpbiBmdW5jdGlvbiBvbmNlIGV2ZXJ5IDAuM3NcbiAgICAgIGlmIChwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2UgJiYgcGx1Z2luLmlkID09PSBnZXRDdXJyZW50UGx1Z2luKCkuaWQpIHtcbiAgICAgICAgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKHNhbmRib3gsIHNhbmRib3guZ2V0TW9kZWwoKSwgY29udGFpbmVyKVxuICAgICAgfVxuICAgIH0sIDMwMClcbiAgfSlcblxuICAvLyBXaGVuIHRoZXJlIGFyZSBtdWx0aS1maWxlIHBsYXlncm91bmRzLCB3ZSBzaG91bGQgc2hvdyB0aGUgaW1wbGljaXQgZmlsZW5hbWUsIGlkZWFsbHkgdGhpcyB3b3VsZCBiZVxuICAvLyBzb21ldGhpbmcgbW9yZSBpbmxpbmUsIGJ1dCB3ZSBjYW4gYWJ1c2UgdGhlIGNvZGUgbGVuc2VzIGZvciBub3cgYmVjYXVzZSB0aGV5IGdldCB0aGVpciBvd24gbGluZSFcbiAgc2FuZGJveC5tb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVyQ29kZUxlbnNQcm92aWRlcihzYW5kYm94Lmxhbmd1YWdlLCB7XG4gICAgcHJvdmlkZUNvZGVMZW5zZXM6IGZ1bmN0aW9uIChtb2RlbCwgdG9rZW4pIHtcbiAgICAgIGNvbnN0IGxlbnNlcyA9ICFzaG93RmlsZUNvZGVMZW5zXG4gICAgICAgID8gW11cbiAgICAgICAgOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHJhbmdlOiB7XG4gICAgICAgICAgICAgICAgc3RhcnRMaW5lTnVtYmVyOiAxLFxuICAgICAgICAgICAgICAgIHN0YXJ0Q29sdW1uOiAxLFxuICAgICAgICAgICAgICAgIGVuZExpbmVOdW1iZXI6IDIsXG4gICAgICAgICAgICAgICAgZW5kQ29sdW1uOiAxLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBpZDogXCJpbXBsaWNpdC1maWxlbmFtZS1maXJzdFwiLFxuICAgICAgICAgICAgICBjb21tYW5kOiB7XG4gICAgICAgICAgICAgICAgaWQ6IFwibm9vcFwiLFxuICAgICAgICAgICAgICAgIHRpdGxlOiBgLy8gQGZpbGVuYW1lOiAke3NhbmRib3guZmlsZXBhdGh9YCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXVxuICAgICAgcmV0dXJuIHsgbGVuc2VzLCBkaXNwb3NlOiAoKSA9PiB7fSB9XG4gICAgfSxcbiAgfSlcblxuICBsZXQgc2hvd0ZpbGVDb2RlTGVucyA9IGZhbHNlXG5cbiAgLy8gSWYgeW91IHNldCB0aGlzIHRvIHRydWUsIHRoZW4gdGhlIG5leHQgdGltZSB0aGUgcGxheWdyb3VuZCB3b3VsZFxuICAvLyBoYXZlIHNldCB0aGUgdXNlcidzIGhhc2ggaXQgd291bGQgYmUgc2tpcHBlZCAtIHVzZWQgZm9yIHNldHRpbmdcbiAgLy8gdGhlIHRleHQgaW4gZXhhbXBsZXNcbiAgbGV0IHN1cHByZXNzTmV4dFRleHRDaGFuZ2VGb3JIYXNoQ2hhbmdlID0gZmFsc2VcblxuICAvLyBTZXRzIHRoZSBVUkwgYW5kIHN0b3JhZ2Ugb2YgdGhlIHNhbmRib3ggc3RyaW5nXG4gIGNvbnN0IHBsYXlncm91bmREZWJvdW5jZWRNYWluRnVuY3Rpb24gPSAoKSA9PiB7XG4gICAgc2hvd0ZpbGVDb2RlTGVucyA9IHNhbmRib3guZ2V0VGV4dCgpLmluY2x1ZGVzKFwiLy8gQGZpbGVuYW1lXCIpXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzYW5kYm94LWhpc3RvcnlcIiwgc2FuZGJveC5nZXRUZXh0KCkpXG4gIH1cblxuICBzYW5kYm94LmVkaXRvci5vbkRpZEJsdXJFZGl0b3JUZXh0KCgpID0+IHtcbiAgICBjb25zdCBhbHdheXNVcGRhdGVVUkwgPSAhbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJkaXNhYmxlLXNhdmUtb24tdHlwZVwiKVxuICAgIGlmIChhbHdheXNVcGRhdGVVUkwpIHtcbiAgICAgIGlmIChzdXBwcmVzc05leHRUZXh0Q2hhbmdlRm9ySGFzaENoYW5nZSkge1xuICAgICAgICBzdXBwcmVzc05leHRUZXh0Q2hhbmdlRm9ySGFzaENoYW5nZSA9IGZhbHNlXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgY29uc3QgbmV3VVJMID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgXCJcIiwgbmV3VVJMKVxuICAgIH1cbiAgfSlcblxuICAvLyBLZWVwcyB0cmFjayBvZiB3aGV0aGVyIHRoZSBwcm9qZWN0IGhhcyBiZWVuIHNldCB1cCBhcyBhbiBFU00gbW9kdWxlIHZpYSBhIHBhY2thZ2UuanNvblxuICBsZXQgaXNFU01Nb2RlID0gZmFsc2VcblxuICAvLyBXaGVuIGFueSBjb21waWxlciBmbGFncyBhcmUgY2hhbmdlZCwgdHJpZ2dlciBhIHBvdGVudGlhbCBjaGFuZ2UgdG8gdGhlIFVSTFxuICBzYW5kYm94LnNldERpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MoYXN5bmMgKCkgPT4ge1xuICAgIHBsYXlncm91bmREZWJvdW5jZWRNYWluRnVuY3Rpb24oKVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICB3aW5kb3cuYXBwSW5zaWdodHMgJiYgd2luZG93LmFwcEluc2lnaHRzLnRyYWNrRXZlbnQoeyBuYW1lOiBcIkNvbXBpbGVyIFNldHRpbmdzIGNoYW5nZWRcIiB9KVxuXG4gICAgY29uc3QgbW9kZWwgPSBzYW5kYm94LmVkaXRvci5nZXRNb2RlbCgpXG4gICAgY29uc3QgcGx1Z2luID0gZ2V0Q3VycmVudFBsdWdpbigpXG4gICAgaWYgKG1vZGVsICYmIHBsdWdpbi5tb2RlbENoYW5nZWQpIHBsdWdpbi5tb2RlbENoYW5nZWQoc2FuZGJveCwgbW9kZWwsIGNvbnRhaW5lcilcbiAgICBpZiAobW9kZWwgJiYgcGx1Z2luLm1vZGVsQ2hhbmdlZERlYm91bmNlKSBwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2Uoc2FuZGJveCwgbW9kZWwsIGNvbnRhaW5lcilcblxuICAgIGNvbnN0IGFsd2F5c1VwZGF0ZVVSTCA9ICFsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRpc2FibGUtc2F2ZS1vbi10eXBlXCIpXG4gICAgaWYgKGFsd2F5c1VwZGF0ZVVSTCkge1xuICAgICAgY29uc3QgbmV3VVJMID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveClcbiAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh7fSwgXCJcIiwgbmV3VVJMKVxuICAgIH1cblxuICAgIC8vIEFkZCBhbiBvdXRlciBwYWNrYWdlLmpzb24gd2l0aCAnbW9kdWxlOiB0eXBlJyBhbmQgZW5zdXJlcyBhbGwgdGhlXG4gICAgLy8gb3RoZXIgc2V0dGluZ3MgYXJlIGlubGluZSBmb3IgRVNNIG1vZGVcbiAgICBjb25zdCBtb2R1bGVOdW1iZXIgPSAoc2FuZGJveC5nZXRDb21waWxlck9wdGlvbnMoKS5tb2R1bGUgYXMgbnVtYmVyKSB8fCAwXG4gICAgY29uc3QgaXNFU012aWFNb2R1bGUgPSBtb2R1bGVOdW1iZXIgPiA5OSAmJiBtb2R1bGVOdW1iZXIgPCAyMDBcbiAgICBjb25zdCBtb2R1bGVSZXNOdW1iZXIgPSBzYW5kYm94LmdldENvbXBpbGVyT3B0aW9ucygpLm1vZHVsZVJlc29sdXRpb24gfHwgMFxuICAgIGNvbnN0IGlzRVNNdmlhTW9kdWxlUmVzID0gbW9kdWxlUmVzTnVtYmVyID4gMiAmJiBtb2R1bGVSZXNOdW1iZXIgPCAxMDBcblxuICAgIGlmIChpc0VTTXZpYU1vZHVsZSB8fCBpc0VTTXZpYU1vZHVsZVJlcykge1xuICAgICAgaWYgKGlzRVNNTW9kZSkgcmV0dXJuXG4gICAgICBpc0VTTU1vZGUgPSB0cnVlXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdWkuZmxhc2hJbmZvKGkoXCJwbGF5X2VzbV9tb2RlXCIpKVxuICAgICAgfSwgMzAwKVxuXG4gICAgICBjb25zdCBuZXh0UmVzID0gbW9kdWxlTnVtYmVyID09PSAxOTkgPyA5OSA6IDJcbiAgICAgIHNhbmRib3guc2V0Q29tcGlsZXJTZXR0aW5ncyh7IHRhcmdldDogOTksIG1vZHVsZVJlc29sdXRpb246IG5leHRSZXMgfSlcbiAgICAgIHNhbmRib3guYWRkTGlicmFyeVRvUnVudGltZShKU09OLnN0cmluZ2lmeSh7IG5hbWU6IFwicGxheWdyb3VuZFwiLCB0eXBlOiBcIm1vZHVsZVwiIH0pLCBcIi9wYWNrYWdlLmpzb25cIilcbiAgICB9XG4gIH0pXG5cbiAgY29uc3Qgc2tpcEluaXRpYWxseVNldHRpbmdIYXNoID0gZG9jdW1lbnQubG9jYXRpb24uaGFzaCAmJiBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmluY2x1ZGVzKFwiZXhhbXBsZS9cIilcbiAgaWYgKCFza2lwSW5pdGlhbGx5U2V0dGluZ0hhc2gpIHBsYXlncm91bmREZWJvdW5jZWRNYWluRnVuY3Rpb24oKVxuXG4gIC8vIFNldHVwIHdvcmtpbmcgd2l0aCB0aGUgZXhpc3RpbmcgVUksIG9uY2UgaXQncyBsb2FkZWRcblxuICAvLyBWZXJzaW9ucyBvZiBUeXBlU2NyaXB0XG5cbiAgLy8gU2V0IHVwIHRoZSBsYWJlbCBmb3IgdGhlIGRyb3Bkb3duXG4gIGNvbnN0IHZlcnNpb25CdXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiI3ZlcnNpb25zID4gYVwiKS5pdGVtKDApXG4gIHZlcnNpb25CdXR0b24uaW5uZXJIVE1MID0gXCJ2XCIgKyBzYW5kYm94LnRzLnZlcnNpb24gKyBcIiA8c3BhbiBjbGFzcz0nY2FyZXQnLz5cIlxuICB2ZXJzaW9uQnV0dG9uLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgYFNlbGVjdCB2ZXJzaW9uIG9mIFR5cGVTY3JpcHQsIGN1cnJlbnRseSAke3NhbmRib3gudHMudmVyc2lvbn1gKVxuXG4gIC8vIEFkZCB0aGUgdmVyc2lvbnMgdG8gdGhlIGRyb3Bkb3duXG4gIGNvbnN0IHZlcnNpb25zTWVudSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIjdmVyc2lvbnMgPiB1bFwiKS5pdGVtKDApXG5cbiAgLy8gRW5hYmxlIGFsbCBzdWJtZW51c1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwibmF2IHVsIGxpXCIpLmZvckVhY2goZSA9PiBlLmNsYXNzTGlzdC5hZGQoXCJhY3RpdmVcIikpXG5cbiAgY29uc3Qgbm90V29ya2luZ0luUGxheWdyb3VuZCA9IFtcIjMuMS42XCIsIFwiMy4wLjFcIiwgXCIyLjguMVwiLCBcIjIuNy4yXCIsIFwiMi40LjFcIl1cblxuICBjb25zdCBhbGxWZXJzaW9ucyA9IFsuLi5zYW5kYm94LnN1cHBvcnRlZFZlcnNpb25zLmZpbHRlcihmID0+ICFub3RXb3JraW5nSW5QbGF5Z3JvdW5kLmluY2x1ZGVzKGYpKSwgXCJOaWdodGx5XCJdXG5cbiAgYWxsVmVyc2lvbnMuZm9yRWFjaCgodjogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIilcbiAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIilcbiAgICBhLnRleHRDb250ZW50ID0gdlxuICAgIGEuaHJlZiA9IFwiI1wiXG5cbiAgICBpZiAodiA9PT0gXCJOaWdodGx5XCIpIHtcbiAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJuaWdodGx5XCIpXG4gICAgfVxuXG4gICAgaWYgKHYudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJldGFcIikpIHtcbiAgICAgIGxpLmNsYXNzTGlzdC5hZGQoXCJiZXRhXCIpXG4gICAgfVxuXG4gICAgbGkub25jbGljayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRVUkwgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjdXJyZW50VVJMLnNwbGl0KFwiI1wiKVswXSlcbiAgICAgIGNvbnN0IHZlcnNpb24gPSB2ID09PSBcIk5pZ2h0bHlcIiA/IFwibmV4dFwiIDogdlxuICAgICAgcGFyYW1zLnNldChcInRzXCIsIHZlcnNpb24pXG5cbiAgICAgIGNvbnN0IGhhc2ggPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmxlbmd0aCA/IGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggOiBcIlwiXG4gICAgICBjb25zdCBuZXdVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfT8ke3BhcmFtc30ke2hhc2h9YFxuXG4gICAgICAvLyBAdHMtaWdub3JlIC0gaXQgaXMgYWxsb3dlZFxuICAgICAgZG9jdW1lbnQubG9jYXRpb24gPSBuZXdVUkxcbiAgICB9XG5cbiAgICBsaS5hcHBlbmRDaGlsZChhKVxuICAgIHZlcnNpb25zTWVudS5hcHBlbmRDaGlsZChsaSlcbiAgfSlcblxuICAvLyBTdXBwb3J0IGRyb3Bkb3duc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkuZHJvcGRvd24gPiBhXCIpLmZvckVhY2gobGluayA9PiB7XG4gICAgY29uc3QgYSA9IGxpbmsgYXMgSFRNTEFuY2hvckVsZW1lbnRcbiAgICBhLm9uY2xpY2sgPSBfZSA9PiB7XG4gICAgICBpZiAoYS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QuY29udGFpbnMoXCJvcGVuXCIpKSB7XG4gICAgICAgIGVzY2FwZVByZXNzZWQoKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXNjYXBlUHJlc3NlZCgpXG4gICAgICAgIGEucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIilcbiAgICAgICAgYS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIsIFwidHJ1ZVwiKVxuXG4gICAgICAgIGNvbnN0IGV4YW1wbGVDb250YWluZXIgPSBhLmNsb3Nlc3QoXCJsaVwiKSEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1bFwiKS5pdGVtKDApXG4gICAgICAgIGlmICghZXhhbXBsZUNvbnRhaW5lcikgcmV0dXJuXG5cbiAgICAgICAgY29uc3QgZmlyc3RMYWJlbCA9IGV4YW1wbGVDb250YWluZXIucXVlcnlTZWxlY3RvcihcImxhYmVsXCIpIGFzIEhUTUxFbGVtZW50XG4gICAgICAgIGlmIChmaXJzdExhYmVsKSBmaXJzdExhYmVsLmZvY3VzKClcblxuICAgICAgICAvLyBTZXQgZXhhY3QgaGVpZ2h0IGFuZCB3aWR0aHMgZm9yIHRoZSBwb3BvdmVycyBmb3IgdGhlIG1haW4gcGxheWdyb3VuZCBuYXZpZ2F0aW9uXG4gICAgICAgIGNvbnN0IGlzUGxheWdyb3VuZFN1Ym1lbnUgPSAhIWEuY2xvc2VzdChcIm5hdlwiKVxuICAgICAgICBpZiAoaXNQbGF5Z3JvdW5kU3VibWVudSkge1xuICAgICAgICAgIGNvbnN0IHBsYXlncm91bmRDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXlncm91bmQtY29udGFpbmVyXCIpIVxuICAgICAgICAgIGV4YW1wbGVDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gYGNhbGMoJHtwbGF5Z3JvdW5kQ29udGFpbmVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCArIDI2fXB4IC0gNHJlbSlgXG5cbiAgICAgICAgICBjb25zdCBzaWRlQmFyV2lkdGggPSAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNpZGViYXJcIikgYXMgYW55KS5vZmZzZXRXaWR0aFxuICAgICAgICAgIGV4YW1wbGVDb250YWluZXIuc3R5bGUud2lkdGggPSBgY2FsYygxMDAlIC0gJHtzaWRlQmFyV2lkdGh9cHggLSA3MXB4KWBcblxuICAgICAgICAgIC8vIEFsbCB0aGlzIGlzIHRvIG1ha2Ugc3VyZSB0aGF0IHRhYmJpbmcgc3RheXMgaW5zaWRlIHRoZSBkcm9wZG93biBmb3IgdHNjb25maWcvZXhhbXBsZXNcbiAgICAgICAgICBjb25zdCBidXR0b25zID0gZXhhbXBsZUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiaW5wdXRcIilcbiAgICAgICAgICBjb25zdCBsYXN0QnV0dG9uID0gYnV0dG9ucy5pdGVtKGJ1dHRvbnMubGVuZ3RoIC0gMSkgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgICBpZiAobGFzdEJ1dHRvbikge1xuICAgICAgICAgICAgcmVkaXJlY3RUYWJQcmVzc1RvKGxhc3RCdXR0b24sIGV4YW1wbGVDb250YWluZXIsIFwiLmV4YW1wbGVzLWNsb3NlXCIpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHNlY3Rpb25zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChcInVsLmV4YW1wbGVzLWRyb3Bkb3duIC5zZWN0aW9uLWNvbnRlbnRcIilcbiAgICAgICAgICAgIHNlY3Rpb25zLmZvckVhY2gocyA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbnMgPSBzLnF1ZXJ5U2VsZWN0b3JBbGwoXCJhLmV4YW1wbGUtbGlua1wiKVxuICAgICAgICAgICAgICBjb25zdCBsYXN0QnV0dG9uID0gYnV0dG9ucy5pdGVtKGJ1dHRvbnMubGVuZ3RoIC0gMSkgYXMgSFRNTEVsZW1lbnRcbiAgICAgICAgICAgICAgaWYgKGxhc3RCdXR0b24pIHtcbiAgICAgICAgICAgICAgICByZWRpcmVjdFRhYlByZXNzVG8obGFzdEJ1dHRvbiwgZXhhbXBsZUNvbnRhaW5lciwgXCIuZXhhbXBsZXMtY2xvc2VcIilcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfSlcblxuICAvKiogSGFuZGxlcyByZW1vdmluZyB0aGUgZHJvcGRvd25zIGxpa2UgdHNjb25maWcvZXhhbXBsZXMvaGFuZGJvb2sgKi9cbiAgY29uc3QgZXNjYXBlUHJlc3NlZCA9ICgpID0+IHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGkub3BlblwiKS5mb3JFYWNoKGkgPT4gaS5jbGFzc0xpc3QucmVtb3ZlKFwib3BlblwiKSlcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLm5hdmJhci1zdWIgbGlcIikuZm9yRWFjaChpID0+IGkuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpKVxuXG4gICAgaGlkZU5hdkZvckhhbmRib29rKHNhbmRib3gpXG4gIH1cblxuICAvLyBIYW5kbGUgZXNjYXBlIGNsb3NpbmcgZHJvcGRvd25zIGV0Y1xuICBkb2N1bWVudC5vbmtleWRvd24gPSBmdW5jdGlvbiAoZXZ0KSB7XG4gICAgZXZ0ID0gZXZ0IHx8IHdpbmRvdy5ldmVudFxuICAgIHZhciBpc0VzY2FwZSA9IGZhbHNlXG4gICAgaWYgKFwia2V5XCIgaW4gZXZ0KSB7XG4gICAgICBpc0VzY2FwZSA9IGV2dC5rZXkgPT09IFwiRXNjYXBlXCIgfHwgZXZ0LmtleSA9PT0gXCJFc2NcIlxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBAdHMtaWdub3JlIC0gdGhpcyB1c2VkIHRvIGJlIHRoZSBjYXNlXG4gICAgICBpc0VzY2FwZSA9IGV2dC5rZXlDb2RlID09PSAyN1xuICAgIH1cbiAgICBpZiAoaXNFc2NhcGUpIGVzY2FwZVByZXNzZWQoKVxuICB9XG5cbiAgY29uc3Qgc2hhcmVBY3Rpb24gPSB7XG4gICAgaWQ6IFwiY29weS1jbGlwYm9hcmRcIixcbiAgICBsYWJlbDogXCJTYXZlIHRvIGNsaXBib2FyZFwiLFxuICAgIGtleWJpbmRpbmdzOiBbbW9uYWNvLktleU1vZC5DdHJsQ21kIHwgbW9uYWNvLktleUNvZGUuS2V5U10sXG5cbiAgICBjb250ZXh0TWVudUdyb3VwSWQ6IFwicnVuXCIsXG4gICAgY29udGV4dE1lbnVPcmRlcjogMS41LFxuXG4gICAgcnVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBVcGRhdGUgdGhlIFVSTCwgdGhlbiB3cml0ZSB0aGF0IHRvIHRoZSBjbGlwYm9hcmRcbiAgICAgIGNvbnN0IG5ld1VSTCA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUoe30sIFwiXCIsIG5ld1VSTClcbiAgICAgIHdpbmRvdy5uYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChsb2NhdGlvbi5ocmVmLnRvU3RyaW5nKCkpLnRoZW4oXG4gICAgICAgICgpID0+IHVpLmZsYXNoSW5mbyhpKFwicGxheV9leHBvcnRfY2xpcGJvYXJkXCIpKSxcbiAgICAgICAgKGU6IGFueSkgPT4gYWxlcnQoZSlcbiAgICAgIClcbiAgICB9LFxuICB9XG5cbiAgY29uc3Qgc2hhcmVCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNoYXJlLWJ1dHRvblwiKVxuICBpZiAoc2hhcmVCdXR0b24pIHtcbiAgICBzaGFyZUJ1dHRvbi5vbmNsaWNrID0gZSA9PiB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIHNoYXJlQWN0aW9uLnJ1bigpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICAvLyBTZXQgdXAgc29tZSBrZXkgY29tbWFuZHNcbiAgICBzYW5kYm94LmVkaXRvci5hZGRBY3Rpb24oc2hhcmVBY3Rpb24pXG5cbiAgICBzYW5kYm94LmVkaXRvci5hZGRBY3Rpb24oe1xuICAgICAgaWQ6IFwicnVuLWpzXCIsXG4gICAgICBsYWJlbDogXCJSdW4gdGhlIGV2YWx1YXRlZCBKYXZhU2NyaXB0IGZvciB5b3VyIFR5cGVTY3JpcHQgZmlsZVwiLFxuICAgICAga2V5YmluZGluZ3M6IFttb25hY28uS2V5TW9kLkN0cmxDbWQgfCBtb25hY28uS2V5Q29kZS5FbnRlcl0sXG5cbiAgICAgIGNvbnRleHRNZW51R3JvdXBJZDogXCJydW5cIixcbiAgICAgIGNvbnRleHRNZW51T3JkZXI6IDEuNSxcblxuICAgICAgcnVuOiBmdW5jdGlvbiAoZWQpIHtcbiAgICAgICAgY29uc3QgcnVuQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJydW4tYnV0dG9uXCIpXG4gICAgICAgIHJ1bkJ1dHRvbiAmJiBydW5CdXR0b24ub25jbGljayAmJiBydW5CdXR0b24ub25jbGljayh7fSBhcyBhbnkpXG4gICAgICB9LFxuICAgIH0pXG4gIH1cblxuICBjb25zdCBydW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ1bi1idXR0b25cIilcbiAgaWYgKHJ1bkJ1dHRvbikge1xuICAgIHJ1bkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgcnVuID0gc2FuZGJveC5nZXRSdW5uYWJsZUpTKClcbiAgICAgIGNvbnN0IHJ1blBsdWdpbiA9IHBsdWdpbnMuZmluZChwID0+IHAuaWQgPT09IFwibG9nc1wiKSFcbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJ1blBsdWdpbiwgZ2V0Q3VycmVudFBsdWdpbigpLCBzYW5kYm94LCB0YWJCYXIsIGNvbnRhaW5lcilcblxuICAgICAgcnVuV2l0aEN1c3RvbUxvZ3MocnVuLCBpKVxuXG4gICAgICBjb25zdCBpc0pTID0gc2FuZGJveC5jb25maWcuZmlsZXR5cGUgPT09IFwianNcIlxuICAgICAgdWkuZmxhc2hJbmZvKGkoaXNKUyA/IFwicGxheV9ydW5fanNcIiA6IFwicGxheV9ydW5fdHNcIikpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICAvLyBIYW5kbGUgdGhlIGNsb3NlIGJ1dHRvbnMgb24gdGhlIGV4YW1wbGVzXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b24uZXhhbXBsZXMtY2xvc2VcIikuZm9yRWFjaChiID0+IHtcbiAgICBjb25zdCBidXR0b24gPSBiIGFzIEhUTUxCdXR0b25FbGVtZW50XG4gICAgYnV0dG9uLm9uY2xpY2sgPSBlc2NhcGVQcmVzc2VkXG4gIH0pXG5cbiAgLy8gU3VwcG9ydCBjbGlja2luZyB0aGUgaGFuZGJvb2sgYnV0dG9uIG9uIHRoZSB0b3AgbmF2XG4gIGNvbnN0IGhhbmRib29rQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoYW5kYm9vay1idXR0b25cIilcblxuICBpZiAoaGFuZGJvb2tCdXR0b24pIHtcbiAgICBoYW5kYm9va0J1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgLy8gVHdvIHBvdGVudGlhbGx5IGNvbmN1cnJlbnQgc2lkZWJhciBuYXZzIGlzIGp1c3QgYSBiaXQgdG9vIG11Y2hcbiAgICAgIC8vIHN0YXRlIHRvIGtlZXAgdHJhY2sgb2YgQVRNXG4gICAgICBpZiAoIWhhbmRib29rQnV0dG9uLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5jb250YWlucyhcImFjdGl2ZVwiKSkge1xuICAgICAgICB1aS5mbGFzaEluZm8oXCJDYW5ub3Qgb3BlbiB0aGUgUGxheWdyb3VuZCBoYW5kYm9vayB3aGVuIGluIGEgR2lzdFwiKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3Qgc2hvd2luZ0hhbmRib29rID0gaGFuZGJvb2tCdXR0b24ucGFyZW50RWxlbWVudCEuY2xhc3NMaXN0LmNvbnRhaW5zKFwib3BlblwiKVxuICAgICAgaWYgKCFzaG93aW5nSGFuZGJvb2spIHtcbiAgICAgICAgZXNjYXBlUHJlc3NlZCgpXG5cbiAgICAgICAgc2hvd05hdigpXG4gICAgICAgIGhhbmRib29rQnV0dG9uLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5hZGQoXCJvcGVuXCIpXG4gICAgICAgIHNob3dOYXZGb3JIYW5kYm9vayhzYW5kYm94LCBlc2NhcGVQcmVzc2VkKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXNjYXBlUHJlc3NlZCgpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgfVxuXG4gIHNldHVwU2lkZWJhclRvZ2dsZSgpXG5cbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29uZmlnLWNvbnRhaW5lclwiKSkge1xuICAgIGNyZWF0ZUNvbmZpZ0Ryb3Bkb3duKHNhbmRib3gsIG1vbmFjbylcbiAgICB1cGRhdGVDb25maWdEcm9wZG93bkZvckNvbXBpbGVyT3B0aW9ucyhzYW5kYm94LCBtb25hY28pXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwbGF5Z3JvdW5kLXNldHRpbmdzXCIpKSB7XG4gICAgY29uc3Qgc2V0dGluZ3NUb2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBsYXlncm91bmQtc2V0dGluZ3NcIikhXG5cbiAgICBzZXR0aW5nc1RvZ2dsZS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3Qgb3BlbiA9IHNldHRpbmdzVG9nZ2xlLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC5jb250YWlucyhcIm9wZW5cIilcbiAgICAgIGNvbnN0IHNpZGViYXJUYWJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXBsdWdpbi10YWJ2aWV3XCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBjb25zdCBzaWRlYmFyQ29udGVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1wbHVnaW4tY29udGFpbmVyXCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgICBsZXQgc2V0dGluZ3NDb250ZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNldHRpbmdzLWNvbnRhaW5lclwiKSBhcyBIVE1MRGl2RWxlbWVudFxuXG4gICAgICBpZiAoIXNldHRpbmdzQ29udGVudCkge1xuICAgICAgICBzZXR0aW5nc0NvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICAgIHNldHRpbmdzQ29udGVudC5jbGFzc05hbWUgPSBcInBsYXlncm91bmQtc2V0dGluZ3MtY29udGFpbmVyIHBsYXlncm91bmQtcGx1Z2luLWNvbnRhaW5lclwiXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gc2V0dGluZ3NQbHVnaW4oaSwgdXRpbHMpXG4gICAgICAgIHNldHRpbmdzLmRpZE1vdW50ICYmIHNldHRpbmdzLmRpZE1vdW50KHNhbmRib3gsIHNldHRpbmdzQ29udGVudClcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5wbGF5Z3JvdW5kLXNpZGViYXJcIikhLmFwcGVuZENoaWxkKHNldHRpbmdzQ29udGVudClcblxuICAgICAgICAvLyBXaGVuIHRoZSBsYXN0IHRhYiBpdGVtIGlzIGhpdCwgZ28gYmFjayB0byB0aGUgc2V0dGluZ3MgYnV0dG9uXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIucGxheWdyb3VuZC1zaWRlYmFyIGlucHV0XCIpXG4gICAgICAgIGNvbnN0IGxhc3RMYWJlbCA9IGxhYmVscy5pdGVtKGxhYmVscy5sZW5ndGggLSAxKSBhcyBIVE1MRWxlbWVudFxuICAgICAgICBpZiAobGFzdExhYmVsKSB7XG4gICAgICAgICAgcmVkaXJlY3RUYWJQcmVzc1RvKGxhc3RMYWJlbCwgdW5kZWZpbmVkLCBcIiNwbGF5Z3JvdW5kLXNldHRpbmdzXCIpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG9wZW4pIHtcbiAgICAgICAgc2lkZWJhclRhYnMuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiXG4gICAgICAgIHNpZGViYXJDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICAgICAgc2V0dGluZ3NDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2lkZWJhclRhYnMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiXG4gICAgICAgIHNpZGViYXJDb250ZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgICBzZXR0aW5nc0NvbnRlbnQuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi5wbGF5Z3JvdW5kLXNpZGViYXIgbGFiZWxcIikhLmZvY3VzKClcbiAgICAgIH1cbiAgICAgIHNldHRpbmdzVG9nZ2xlLnBhcmVudEVsZW1lbnQhLmNsYXNzTGlzdC50b2dnbGUoXCJvcGVuXCIpXG4gICAgfVxuXG4gICAgc2V0dGluZ3NUb2dnbGUuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZSA9PiB7XG4gICAgICBjb25zdCBpc09wZW4gPSBzZXR0aW5nc1RvZ2dsZS5wYXJlbnRFbGVtZW50IS5jbGFzc0xpc3QuY29udGFpbnMoXCJvcGVuXCIpXG4gICAgICBpZiAoZS5rZXkgPT09IFwiVGFiXCIgJiYgaXNPcGVuKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1vcHRpb25zIGxpIGlucHV0XCIpIGFzIGFueVxuICAgICAgICByZXN1bHQuZm9jdXMoKVxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLy8gU3VwcG9ydCBncmFiYmluZyBleGFtcGxlcyBmcm9tIHRoZSBsb2NhdGlvbiBoYXNoXG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjZXhhbXBsZVwiKSkge1xuICAgIGNvbnN0IGV4YW1wbGVOYW1lID0gbG9jYXRpb24uaGFzaC5yZXBsYWNlKFwiI2V4YW1wbGUvXCIsIFwiXCIpLnRyaW0oKVxuICAgIHNhbmRib3guY29uZmlnLmxvZ2dlci5sb2coXCJMb2FkaW5nIGV4YW1wbGU6XCIsIGV4YW1wbGVOYW1lKVxuICAgIGdldEV4YW1wbGVTb3VyY2VDb2RlKGNvbmZpZy5wcmVmaXgsIGNvbmZpZy5sYW5nLCBleGFtcGxlTmFtZSkudGhlbihleCA9PiB7XG4gICAgICBpZiAoZXguZXhhbXBsZSAmJiBleC5jb2RlKSB7XG4gICAgICAgIGNvbnN0IHsgZXhhbXBsZSwgY29kZSB9ID0gZXhcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGxvY2Fsc3RvcmFnZSBzaG93aW5nIHRoYXQgeW91J3ZlIHNlZW4gdGhpcyBwYWdlXG4gICAgICAgIGlmIChsb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICBjb25zdCBzZWVuVGV4dCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZXhhbXBsZXMtc2VlblwiKSB8fCBcInt9XCJcbiAgICAgICAgICBjb25zdCBzZWVuID0gSlNPTi5wYXJzZShzZWVuVGV4dClcbiAgICAgICAgICBzZWVuW2V4YW1wbGUuaWRdID0gZXhhbXBsZS5oYXNoXG4gICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJleGFtcGxlcy1zZWVuXCIsIEpTT04uc3RyaW5naWZ5KHNlZW4pKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWxsTGlua3MgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiZXhhbXBsZS1saW5rXCIpXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgZm9yIChjb25zdCBsaW5rIG9mIGFsbExpbmtzKSB7XG4gICAgICAgICAgaWYgKGxpbmsudGV4dENvbnRlbnQgPT09IGV4YW1wbGUudGl0bGUpIHtcbiAgICAgICAgICAgIGxpbmsuY2xhc3NMaXN0LmFkZChcImhpZ2hsaWdodFwiKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGRvY3VtZW50LnRpdGxlID0gXCJUeXBlU2NyaXB0IFBsYXlncm91bmQgLSBcIiArIGV4YW1wbGUudGl0bGVcbiAgICAgICAgc3VwcHJlc3NOZXh0VGV4dENoYW5nZUZvckhhc2hDaGFuZ2UgPSB0cnVlXG4gICAgICAgIHNhbmRib3guc2V0VGV4dChjb2RlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3VwcHJlc3NOZXh0VGV4dENoYW5nZUZvckhhc2hDaGFuZ2UgPSB0cnVlXG4gICAgICAgIHNhbmRib3guc2V0VGV4dChcIi8vIFRoZXJlIHdhcyBhbiBpc3N1ZSBnZXR0aW5nIHRoZSBleGFtcGxlLCBiYWQgVVJMPyBDaGVjayB0aGUgY29uc29sZSBpbiB0aGUgZGV2ZWxvcGVyIHRvb2xzXCIpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8vIFNldCB0aGUgZXJyb3JzIG51bWJlciBpbiB0aGUgc2lkZWJhciB0YWJzXG4gIGNvbnN0IG1vZGVsID0gc2FuZGJveC5nZXRNb2RlbCgpXG4gIG1vZGVsLm9uRGlkQ2hhbmdlRGVjb3JhdGlvbnMoKCkgPT4ge1xuICAgIGNvbnN0IG1hcmtlcnMgPSBzYW5kYm94Lm1vbmFjby5lZGl0b3IuZ2V0TW9kZWxNYXJrZXJzKHsgcmVzb3VyY2U6IG1vZGVsLnVyaSB9KS5maWx0ZXIobSA9PiBtLnNldmVyaXR5ICE9PSAxKVxuICAgIHV0aWxzLnNldE5vdGlmaWNhdGlvbnMoXCJlcnJvcnNcIiwgbWFya2Vycy5sZW5ndGgpXG4gIH0pXG5cbiAgLy8gU2V0cyB1cCBhIHdheSB0byBjbGljayBiZXR3ZWVuIGV4YW1wbGVzXG4gIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJMaW5rUHJvdmlkZXIoc2FuZGJveC5sYW5ndWFnZSwgbmV3IEV4YW1wbGVIaWdobGlnaHRlcigpKVxuXG4gIGNvbnN0IGxhbmd1YWdlU2VsZWN0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxhbmd1YWdlLXNlbGVjdG9yXCIpIGFzIEhUTUxTZWxlY3RFbGVtZW50XG4gIGlmIChsYW5ndWFnZVNlbGVjdG9yKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhsb2NhdGlvbi5zZWFyY2gpXG4gICAgY29uc3Qgb3B0aW9ucyA9IFtcInRzXCIsIFwiZC50c1wiLCBcImpzXCJdXG4gICAgbGFuZ3VhZ2VTZWxlY3Rvci5vcHRpb25zLnNlbGVjdGVkSW5kZXggPSBvcHRpb25zLmluZGV4T2YocGFyYW1zLmdldChcImZpbGV0eXBlXCIpIHx8IFwidHNcIilcblxuICAgIGxhbmd1YWdlU2VsZWN0b3Iub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICBjb25zdCBmaWxldHlwZSA9IG9wdGlvbnNbTnVtYmVyKGxhbmd1YWdlU2VsZWN0b3Iuc2VsZWN0ZWRJbmRleCB8fCAwKV1cbiAgICAgIGNvbnN0IHF1ZXJ5ID0gc2FuZGJveC5jcmVhdGVVUkxRdWVyeVdpdGhDb21waWxlck9wdGlvbnMoc2FuZGJveCwgeyBmaWxldHlwZSB9KVxuICAgICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IGZ1bGxVUkxcbiAgICB9XG4gIH1cblxuICAvLyBFbnN1cmUgdGhhdCB0aGUgZWRpdG9yIGlzIGZ1bGwtd2lkdGggd2hlbiB0aGUgc2NyZWVuIHJlc2l6ZXNcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgKCkgPT4ge1xuICAgIHNhbmRib3guZWRpdG9yLmxheW91dCgpXG4gIH0pXG5cbiAgY29uc3QgdWkgPSBjcmVhdGVVSSgpXG4gIGNvbnN0IGV4cG9ydGVyID0gY3JlYXRlRXhwb3J0ZXIoc2FuZGJveCwgbW9uYWNvLCB1aSlcblxuICBjb25zdCBwbGF5Z3JvdW5kID0ge1xuICAgIGV4cG9ydGVyLFxuICAgIHVpLFxuICAgIHJlZ2lzdGVyUGx1Z2luLFxuICAgIHBsdWdpbnMsXG4gICAgZ2V0Q3VycmVudFBsdWdpbixcbiAgICB0YWJzLFxuICAgIHNldERpZFVwZGF0ZVRhYixcbiAgICBjcmVhdGVVdGlscyxcbiAgfVxuXG4gIHdpbmRvdy50cyA9IHNhbmRib3gudHNcbiAgd2luZG93LnNhbmRib3ggPSBzYW5kYm94XG4gIHdpbmRvdy5wbGF5Z3JvdW5kID0gcGxheWdyb3VuZFxuXG4gIGNvbnNvbGUubG9nKGBVc2luZyBUeXBlU2NyaXB0ICR7d2luZG93LnRzLnZlcnNpb259YClcblxuICBjb25zb2xlLmxvZyhcIkF2YWlsYWJsZSBnbG9iYWxzOlwiKVxuICBjb25zb2xlLmxvZyhcIlxcdHdpbmRvdy50c1wiLCB3aW5kb3cudHMpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnNhbmRib3hcIiwgd2luZG93LnNhbmRib3gpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnBsYXlncm91bmRcIiwgd2luZG93LnBsYXlncm91bmQpXG4gIGNvbnNvbGUubG9nKFwiXFx0d2luZG93LnJlYWN0XCIsIHdpbmRvdy5yZWFjdClcbiAgY29uc29sZS5sb2coXCJcXHR3aW5kb3cucmVhY3RET01cIiwgd2luZG93LnJlYWN0RE9NKVxuXG4gIC8qKiBUaGUgcGx1Z2luIHN5c3RlbSAqL1xuICBjb25zdCBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luID0gKFxuICAgIHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbiB8ICgodXRpbHM6IFBsdWdpblV0aWxzKSA9PiBQbGF5Z3JvdW5kUGx1Z2luKSxcbiAgICBhdXRvQWN0aXZhdGU6IGJvb2xlYW5cbiAgKSA9PiB7XG4gICAgbGV0IHJlYWR5UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luXG4gICAgLy8gQ2FuIGVpdGhlciBiZSBhIGZhY3RvcnksIG9yIG9iamVjdFxuICAgIGlmICh0eXBlb2YgcGx1Z2luID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNvbnN0IHV0aWxzID0gY3JlYXRlVXRpbHMoc2FuZGJveCwgcmVhY3QpXG4gICAgICByZWFkeVBsdWdpbiA9IHBsdWdpbih1dGlscylcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhZHlQbHVnaW4gPSBwbHVnaW5cbiAgICB9XG5cbiAgICBpZiAoYXV0b0FjdGl2YXRlKSB7XG4gICAgICBjb25zb2xlLmxvZyhyZWFkeVBsdWdpbilcbiAgICB9XG5cbiAgICBwbGF5Z3JvdW5kLnJlZ2lzdGVyUGx1Z2luKHJlYWR5UGx1Z2luKVxuXG4gICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICBjb25zdCBwbHVnaW5XYW50c0Zyb250ID0gcmVhZHlQbHVnaW4uc2hvdWxkQmVTZWxlY3RlZCAmJiByZWFkeVBsdWdpbi5zaG91bGRCZVNlbGVjdGVkKClcblxuICAgIGlmIChwbHVnaW5XYW50c0Zyb250IHx8IGF1dG9BY3RpdmF0ZSkge1xuICAgICAgLy8gQXV0by1zZWxlY3QgdGhlIGRldiBwbHVnaW5cbiAgICAgIGFjdGl2YXRlUGx1Z2luKHJlYWR5UGx1Z2luLCBnZXRDdXJyZW50UGx1Z2luKCksIHNhbmRib3gsIHRhYkJhciwgY29udGFpbmVyKVxuICAgIH1cbiAgfVxuXG4gIC8vIERldiBtb2RlIHBsdWdpblxuICBpZiAoY29uZmlnLnN1cHBvcnRDdXN0b21QbHVnaW5zICYmIGFsbG93Q29ubmVjdGluZ1RvTG9jYWxob3N0KCkpIHtcbiAgICB3aW5kb3cuZXhwb3J0cyA9IHt9XG4gICAgY29uc29sZS5sb2coXCJDb25uZWN0aW5nIHRvIGRldiBwbHVnaW5cIilcbiAgICB0cnkge1xuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgY29uc3QgcmUgPSB3aW5kb3cucmVxdWlyZVxuICAgICAgcmUoW1wibG9jYWwvaW5kZXhcIl0sIChkZXZQbHVnaW46IGFueSkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlNldCB1cCBkZXYgcGx1Z2luIGZyb20gbG9jYWxob3N0OjUwMDBcIilcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhY3RpdmF0ZUV4dGVybmFsUGx1Z2luKGRldlBsdWdpbiwgdHJ1ZSlcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdWkuZmxhc2hJbmZvKFwiRXJyb3I6IENvdWxkIG5vdCBsb2FkIGRldiBwbHVnaW4gZnJvbSBsb2NhbGhvc3Q6NTAwMFwiKVxuICAgICAgICAgIH0sIDcwMClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgZGV2IHBsdWdpblwiKVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICB9XG4gIH1cblxuICBjb25zdCBkb3dubG9hZFBsdWdpbiA9IChwbHVnaW46IHN0cmluZywgYXV0b0VuYWJsZTogYm9vbGVhbikgPT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICBjb25zdCByZSA9IHdpbmRvdy5yZXF1aXJlXG4gICAgICByZShbYHVucGtnLyR7cGx1Z2lufUBsYXRlc3QvZGlzdC9pbmRleGBdLCAoZGV2UGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luKSA9PiB7XG4gICAgICAgIGFjdGl2YXRlRXh0ZXJuYWxQbHVnaW4oZGV2UGx1Z2luLCBhdXRvRW5hYmxlKVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlByb2JsZW0gbG9hZGluZyB1cCB0aGUgcGx1Z2luOlwiLCBwbHVnaW4pXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKVxuICAgIH1cbiAgfVxuXG4gIGlmIChjb25maWcuc3VwcG9ydEN1c3RvbVBsdWdpbnMpIHtcbiAgICAvLyBHcmFiIG9uZXMgZnJvbSBsb2NhbHN0b3JhZ2VcbiAgICBhY3RpdmVQbHVnaW5zKCkuZm9yRWFjaChwID0+IGRvd25sb2FkUGx1Z2luKHAuaWQsIGZhbHNlKSlcblxuICAgIC8vIE9mZmVyIHRvIGluc3RhbGwgb25lIGlmICdpbnN0YWxsLXBsdWdpbicgaXMgYSBxdWVyeSBwYXJhbVxuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMobG9jYXRpb24uc2VhcmNoKVxuICAgIGNvbnN0IHBsdWdpblRvSW5zdGFsbCA9IHBhcmFtcy5nZXQoXCJpbnN0YWxsLXBsdWdpblwiKVxuICAgIGlmIChwbHVnaW5Ub0luc3RhbGwpIHtcbiAgICAgIGNvbnN0IGFscmVhZHlJbnN0YWxsZWQgPSBhY3RpdmVQbHVnaW5zKCkuZmluZChwID0+IHAuaWQgPT09IHBsdWdpblRvSW5zdGFsbClcbiAgICAgIGlmICghYWxyZWFkeUluc3RhbGxlZCkge1xuICAgICAgICBjb25zdCBzaG91bGREb0l0ID0gY29uZmlybShcIldvdWxkIHlvdSBsaWtlIHRvIGluc3RhbGwgdGhlIHRoaXJkIHBhcnR5IHBsdWdpbj9cXG5cXG5cIiArIHBsdWdpblRvSW5zdGFsbClcbiAgICAgICAgaWYgKHNob3VsZERvSXQpIHtcbiAgICAgICAgICBhZGRDdXN0b21QbHVnaW4ocGx1Z2luVG9JbnN0YWxsKVxuICAgICAgICAgIGRvd25sb2FkUGx1Z2luKHBsdWdpblRvSW5zdGFsbCwgdHJ1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IFt0c01ham9yLCB0c01pbm9yXSA9IHNhbmRib3gudHMudmVyc2lvbi5zcGxpdChcIi5cIilcbiAgaWYgKFxuICAgIChwYXJzZUludCh0c01ham9yKSA+IDQgfHwgKHBhcnNlSW50KHRzTWFqb3IpID09IDQgJiYgcGFyc2VJbnQodHNNaW5vcikgPj0gNikpICYmXG4gICAgbW9uYWNvLmxhbmd1YWdlcy5yZWdpc3RlcklubGF5SGludHNQcm92aWRlclxuICApIHtcbiAgICBtb25hY28ubGFuZ3VhZ2VzLnJlZ2lzdGVySW5sYXlIaW50c1Byb3ZpZGVyKHNhbmRib3gubGFuZ3VhZ2UsIGNyZWF0ZVR3b3NsYXNoSW5sYXlQcm92aWRlcihzYW5kYm94KSlcbiAgfVxuXG4gIGlmIChsb2NhdGlvbi5oYXNoLnN0YXJ0c1dpdGgoXCIjc2hvdy1leGFtcGxlc1wiKSkge1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleGFtcGxlcy1idXR0b25cIik/LmNsaWNrKClcbiAgICB9LCAxMDApXG4gIH1cblxuICBpZiAobG9jYXRpb24uaGFzaC5zdGFydHNXaXRoKFwiI3Nob3ctd2hhdGlzbmV3XCIpKSB7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIndoYXRpc25ldy1idXR0b25cIik/LmNsaWNrKClcbiAgICB9LCAxMDApXG4gIH1cblxuICAvLyBHcmFiIHRoZSBjb250ZW50cyBvZiBhIEdpc3RcbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNnaXN0L1wiKSkge1xuICAgIGdpc3RQb3dlcmVkTmF2QmFyKHNhbmRib3gsIHVpLCBzaG93TmF2KVxuICB9XG5cbiAgLy8gQXV0by1sb2FkIGludG8gdGhlIHBsYXlncm91bmRcbiAgaWYgKGxvY2F0aW9uLmhhc2guc3RhcnRzV2l0aChcIiNoYW5kYm9va1wiKSkge1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoYW5kYm9vay1idXR0b25cIik/LmNsaWNrKClcbiAgICB9LCAxMDApXG4gIH1cblxuICByZXR1cm4gcGxheWdyb3VuZFxufVxuXG5leHBvcnQgdHlwZSBQbGF5Z3JvdW5kID0gUmV0dXJuVHlwZTx0eXBlb2Ygc2V0dXBQbGF5Z3JvdW5kPlxuXG5jb25zdCByZWRpcmVjdFRhYlByZXNzVG8gPSAoZWxlbWVudDogSFRNTEVsZW1lbnQsIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCB1bmRlZmluZWQsIHF1ZXJ5OiBzdHJpbmcpID0+IHtcbiAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICBpZiAoZS5rZXkgPT09IFwiVGFiXCIpIHtcbiAgICAgIGNvbnN0IGhvc3QgPSBjb250YWluZXIgfHwgZG9jdW1lbnRcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhvc3QucXVlcnlTZWxlY3RvcihxdWVyeSkgYXMgYW55XG4gICAgICBpZiAoIXJlc3VsdCkgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCB0byBmaW5kIGEgcmVzdWx0IGZvciBrZXlkb3duYClcbiAgICAgIHJlc3VsdC5mb2N1cygpXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICB9XG4gIH0pXG59XG4iXX0=