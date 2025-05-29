import JoePlugin from "../main";

// Mock Obsidian TFile and app.vault.read
const mockRead = jest.fn();
const mockApp = {
	vault: {
		read: mockRead,
	},
};

describe("getMetadataFromNote", () => {
	let plugin: JoePlugin;
	const mockManifest = {
		id: "test-plugin",
		name: "Test Plugin",
		version: "0.0.1",
		dir: "",
		description: "",
		author: "",
		authorUrl: "",
		isDesktopOnly: false,
		minAppVersion: "0.0.0",
	} as import("obsidian").PluginManifest;

	beforeEach(() => {
		plugin = new JoePlugin(
			mockApp as unknown as import("obsidian").App,
			mockManifest
		);
		mockRead.mockReset();
	});

	it("extracts url and title from Metadata section", async () => {
		mockRead.mockResolvedValue(
			`Some note\n\n## Metadata\n- URL: https://example.com\n- Full Title: Example Title\n\n## Highlights\n- something else`
		);
		const file = { path: "dummy.md" } as any;
		const result = await plugin.getMetadataFromNote(file);
		expect(result).toEqual({
			url: "https://example.com",
			title: "Example Title",
		});
	});

	it("returns nulls if Metadata section is missing", async () => {
		mockRead.mockResolvedValue("No metadata here");
		const file = { path: "dummy.md" } as any;
		const result = await plugin.getMetadataFromNote(file);
		expect(result).toEqual({ url: null, title: null });
	});

	it("handles different casing and whitespace", async () => {
		mockRead.mockResolvedValue(
			`irrelevant\n\n## metadata\n   - url: https://foo.com\n   - full title:   Foo Bar   \n# Next Section`
		);
		const file = { path: "dummy.md" } as any;
		const result = await plugin.getMetadataFromNote(file);
		expect(result).toEqual({ url: "https://foo.com", title: "Foo Bar" });
	});

	it("stops at next heading and ignores lines after", async () => {
		mockRead.mockResolvedValue(
			`## Metadata\n- URL: https://a.com\n- Full Title: A\n## Something else\n- URL: https://b.com\n- Full Title: B`
		);
		const file = { path: "dummy.md" } as any;
		const result = await plugin.getMetadataFromNote(file);
		expect(result).toEqual({ url: "https://a.com", title: "A" });
	});

	it("returns null for missing url or title", async () => {
		mockRead.mockResolvedValue(`## Metadata\n- Full Title: Only Title`);
		const file = { path: "dummy.md" } as any;
		const result = await plugin.getMetadataFromNote(file);
		expect(result).toEqual({ url: null, title: "Only Title" });

		mockRead.mockResolvedValue(`## Metadata\n- URL: only-url.com`);
		const result2 = await plugin.getMetadataFromNote(file);
		expect(result2).toEqual({ url: "only-url.com", title: null });
	});
});
