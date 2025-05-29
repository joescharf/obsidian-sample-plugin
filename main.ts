import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface JoePluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: JoePluginSettings = {
	mySetting: "default",
};

export default class JoePlugin extends Plugin {
	settings: JoePluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Joe Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("This is a notice! Consider yourself noticed.");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		// Add hover event for Readwise links
		this.registerDomEvent(
			document,
			"mouseover",
			async (evt: MouseEvent) => {
				const target = evt.target as HTMLElement;
				if (target && target.tagName === "A") {
					const href = (target as HTMLAnchorElement).href;
					if (href && href.includes("readwise.io")) {
						// Search for the Readwise article in your vault
						const articleContent =
							await this.findReadwiseArticleByUrl(href, target);
						if (articleContent) {
							// this.showHoverPopup(target, articleContent);
						}
					}
				}
			}
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Helper to search for Readwise article by URL
	// Add a cancelable clipboard copy with delay
	async findReadwiseArticleByUrl(
		url: string,
		target?: HTMLElement
	): Promise<string | null> {
		console.log(`Searching for Readwise article with URL: ${url}`);
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			const content = await this.app.vault.read(file);
			if (!content.includes(url)) continue;
			const lines = content.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.startsWith("- ") && trimmed.includes(url)) {
					let highlight = trimmed.replace(/^-\s*/, "");
					highlight = highlight.replace(
						/\(\[View Highlight\]\([^)]*\)\).*/,
						""
					);
					highlight = highlight.replace(
						/\[([^\]]+)\]\([^)]*\)/g,
						"$1"
					);
					highlight = highlight.replace(/<[^>]+>/g, "");
					const snippet = highlight.substring(0, 200) + "...";
					const metadata = await this.getMetadataFromNote(file);
					const highlightWords = highlight
						.split(/\s+/)
						.filter(Boolean);
					let highlight_start_end = "";
					if (highlightWords.length > 10) {
						const start = highlightWords.slice(0, 5).join(" ");
						const end = highlightWords.slice(-5).join(" ");
						highlight_start_end = `${encodeURIComponent(
							start
						)},${encodeURIComponent(end)}`;
					} else {
						highlight_start_end = encodeURIComponent(highlight);
					}
					let popupText = `From note: ${file.basename}\n${snippet}`;
					let markdownUrl = "";
					let markdownUrlWithHighlight = "";
					if (metadata.title && metadata.url) {
						markdownUrl = `[${metadata.title}](${metadata.url})`;
						const urlWithHighlight = `${metadata.url}#:~:text=${highlight_start_end}`;
						markdownUrlWithHighlight = `[${metadata.title}](${urlWithHighlight})`;
						popupText += `\n${markdownUrl}`;
						popupText += `\n${markdownUrlWithHighlight}`;
						if (target) {
							let metaKeyHeld = false;
							let altKeyHeld = false;
							const mouseMoveHandler = (e: MouseEvent) => {
								metaKeyHeld = e.metaKey;
								altKeyHeld = e.altKey;
							};
							const mouseLeaveHandler = () => {
								clearTimeout(copyTimeout);
								target.removeEventListener(
									"mouseleave",
									mouseLeaveHandler
								);
								target.removeEventListener(
									"mousemove",
									mouseMoveHandler
								);
							};
							target.addEventListener(
								"mouseleave",
								mouseLeaveHandler
							);
							target.addEventListener(
								"mousemove",
								mouseMoveHandler
							);
							const copyTimeout = setTimeout(async () => {
								target.removeEventListener(
									"mouseleave",
									mouseLeaveHandler
								);
								target.removeEventListener(
									"mousemove",
									mouseMoveHandler
								);
								if (altKeyHeld && metadata.url) {
									await navigator.clipboard.writeText(
										metadata.url
									);
									new Notice(
										"Original article URL copied to clipboard!"
									);
								} else if (metaKeyHeld && metadata.url) {
									const urlWithHighlight = `${metadata.url}#:~:text=${highlight_start_end}`;
									await navigator.clipboard.writeText(
										urlWithHighlight
									);
									new Notice(
										"URL with highlight fragment copied to clipboard!"
									);
								} else {
									await navigator.clipboard.writeText(
										markdownUrlWithHighlight
									);
									new Notice(
										"Markdown URL with highlight copied to clipboard!"
									);
								}
							}, 500);
						}
						console.log("Markdown URL:", markdownUrl);
						console.log(
							"Markdown URL with highlight:",
							markdownUrlWithHighlight
						);
					}
					if (metadata.title)
						popupText += `\nFull Title: ${metadata.title}`;
					if (metadata.url)
						popupText += `\nOriginal article: ${metadata.url}`;
					console.log("Readwise URL: ", url);
					console.log("File Basename: ", file.basename);
					console.log("Full Title: ", metadata.title);
					console.log("Original URL: ", metadata.url);
					console.log("Highlight: ", highlight);
					console.log("Snippet: ", snippet);
					return popupText;
				}
			}
		}
		return null;
	}

	// Helper to get the original article URL and Full Title from the Metadata section
	async getMetadataFromNote(
		file: import("obsidian").TFile
	): Promise<{ url: string | null; title: string | null }> {
		const content = await this.app.vault.read(file);
		const lines = content.split("\n");
		let inMetadata = false;
		let url: string | null = null;
		let title: string | null = null;
		for (const line of lines) {
			const trimmed = line.trim();
			if (!inMetadata && trimmed.toLowerCase() === "## metadata") {
				inMetadata = true;
				continue;
			}
			if (inMetadata) {
				if (
					/^#+ /.test(trimmed) &&
					trimmed.toLowerCase() !== "## metadata"
				)
					break;
				if (!url) {
					const urlMatch = trimmed.match(/^[-*]\s*url:\s*(\S+)/i);
					if (urlMatch) url = urlMatch[1];
				}
				if (!title) {
					const titleMatch = trimmed.match(
						/^[-*]\s*full title:\s*(.+)$/i
					);
					if (titleMatch) title = titleMatch[1].trim();
				}
				if (url && title) break;
			}
		}
		return { url, title };
	}

	// Helper to show a hover popup
	showHoverPopup(target: HTMLElement, content: string) {
		// Simple implementation: show a tooltip near the link
		const popup = document.createElement("div");
		popup.className = "readwise-hover-popup";
		popup.textContent = content;
		popup.style.position = "absolute";
		popup.style.background = "#222";
		popup.style.color = "#fff";
		popup.style.padding = "8px";
		popup.style.borderRadius = "6px";
		popup.style.zIndex = "9999";
		const rect = target.getBoundingClientRect();
		popup.style.left = `${rect.left + window.scrollX}px`;
		popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
		document.body.appendChild(popup);

		const removePopup = () => {
			popup.remove();
			target.removeEventListener("mouseleave", removePopup);
		};
		target.addEventListener("mouseleave", removePopup);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: JoePlugin;

	constructor(app: App, plugin: JoePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
