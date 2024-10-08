<template>
	<div>
		<v-toolbar color="grey lighten-5 elevation-0" :height="toolbarHeight">
			<v-btn flat icon color="grey darken-1" @click="clean">
				<v-icon :title="$t('clean')" style="font-size: 24px">delete</v-icon>
			</v-btn>

			<v-divider class="mx-3" inset vertical></v-divider>

			<v-flex xs4>
        		<v-select multiple v-model="logLevelsSelected" :items="logLevels" @change="logLevelsToShowChanged"></v-select>
			</v-flex>

			<v-spacer></v-spacer>

			<v-divider class="mx-3" inset vertical></v-divider>

			<v-btn :depressed="scrollToEnd" :flat="!scrollToEnd" icon color="grey darken-1" @click="scrollToEndClicked">
				<v-icon :title="$t('scroll-to-end')" style="font-size: 24px">vertical_align_bottom</v-icon>
			</v-btn>

			<v-btn v-if="showDevToolsButton" flat icon color="grey darken-1" @click="handleOpenDevTools">
				<v-icon title="DevTools" style="font-size: 24px">web</v-icon>
			</v-btn>

			<v-btn flat icon color="grey darken-1" @click="settingsButtonClicked">
				<v-icon :title="$t('global-settings')" style="font-size: 24px">settings</v-icon>
			</v-btn>
		</v-toolbar>

		<div ref="viewer" :style="{'height': height + 'px'}"></div>
	</div>
</template>

<script>
	const { ipcRenderer } = require('electron');

	const Tail = require("../tail");
	const AceEditor = require("../aceEditor");
	const UserPreferences = require("../userPreferences");

  const remote = window.electron.remote;

	let userPreferences = new UserPreferences();

	let tail;
	let viewer;

	export default {
		props: [
			'file',
			'fileSettings',
			'globalSettings'
		],
		data() {
			return {
				toolbarHeight: 40,
				logLevels: ["Debug", "Info", "Warning", "Error", "Fatal"],
				logLevelsSelected: this.getLogLevelsToShow(),
				height: this.calcHeight(),
				scrollToEnd: false,
				currentFileSettings: this.fileSettings,
				showDevToolsButton: remote.getGlobal('devMode')
			}
		},
		mounted: function() {
			window.addEventListener('resize', this.handleResize);

			this.viewer = AceEditor.createViewer(this.$refs.viewer, this.globalSettings);

			this.startTail();
		},
		beforeDestroy: function() {
			tail.stop();

			window.removeEventListener('resize', this.handleResize);
		},
		methods: {
			defaultLogLevel() {
        		return this.currentFileSettings.info;
			},
			getSeveritySettings(line) {
				if (line.search(this.globalSettings.fatal.pattern) !== -1) {
					return this.currentFileSettings.fatal;
				}
				else if (line.search(this.globalSettings.error.pattern) !== -1) {
					return this.currentFileSettings.error;
				}
				else if (line.search(this.globalSettings.warning.pattern) !== -1) {
					return this.currentFileSettings.warning;
				}
				else if (line.search(this.globalSettings.info.pattern) !== -1) {
					return this.currentFileSettings.info;
				}
				else if (line.search(this.globalSettings.debug.pattern) !== -1) {
					return this.currentFileSettings.debug;
				}
				else {
					return null;
				}
			},
			getLogLevelsToShow() {
				return this.fileSettings.getLogLevelsToShow().map(severity => this.capitalizeFirstLetter(severity));
			},
			logLevelsToShowChanged() {
				this.currentFileSettings.setLogLevelsToShow(this.logLevelsSelected);

				userPreferences.saveFileSettings(this.file, this.currentFileSettings);

				tail.stop();
				this.clean();
				this.startTail();
			},
			clean() {
				this.viewer.setValue("");
			},
			changeFontSize(fontSize) {
				this.viewer.setFontSize(fontSize + "px");
			},
			scrollToEndClicked() {
				this.scrollToEnd = !this.scrollToEnd;
			},
			settingsButtonClicked() {
				this.$emit('settingsButtonClicked');
			},
			startTail() {
				tail = new Tail(this.file, 1000);

				let previousLineSeveritySettings = this.defaultLogLevel();
					
				tail.on('readLines', lines => {
					lines.map(line => {
						let severitySettings = this.getSeveritySettings(line);

						if (!severitySettings) {
							severitySettings = previousLineSeveritySettings;
						}
						else {
							previousLineSeveritySettings = severitySettings;
						}

						return {
							severitySettings: severitySettings,
							line: line
						};
					})
					.filter(line => line.severitySettings.show)
					.forEach(line => {
						// Ace editor not insert empty lines, and we want all lines
						// to a better layout
						if (line.line === "") {
							line.line = " ";
						}

						const position = {
							row: this.viewer.session.getLength(),
							column: 0
						};

						this.viewer.session.insert(position, line.line + "\n");

						this.scrollToEndCommand();
					});
				});
				
				tail.start().catch(error => this.$emit('fileNotFoundError', {file: this.file}));
			},
			handleOpenDevTools() {
				console.log("Opening DevTools");
				ipcRenderer.send('open-devtools');
			},
			handleResize() {
				this.height = this.calcHeight();
			},
			calcHeight() {
				return window.innerHeight - document.querySelector(".v-tabs__bar").offsetHeight - 40;
			},
			capitalizeFirstLetter(string) {
    			return string.charAt(0).toUpperCase() + string.slice(1);
			},
			scrollToEndCommand() {
				const totalLines = this.viewer.session.getLength();

				if (this.scrollToEnd) {
					this.viewer.scrollToLine(totalLines + 1, false, false);
				}
			}
		}
	}
</script>