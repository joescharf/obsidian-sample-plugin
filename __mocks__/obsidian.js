// __mocks__/obsidian.js
module.exports = {
	Plugin: class {},
	PluginSettingTab: class {},
	Modal: class {},
	Notice: class {},
	Setting: class {
		setName() {
			return this;
		}
		setDesc() {
			return this;
		}
		addText() {
			return this;
		}
	},
	MarkdownView: class {},
	App: class {},
	TFile: class {},
};
