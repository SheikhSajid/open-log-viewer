const Store = __non_webpack_require__('electron-store');

let instance = null;

module.exports = class UserPreferences {
    constructor() {
        if (!instance) {
            instance = this;
        }

        this.store = new Store();

        return instance;
    }

    addFile(fileName, filePath) {
        let files = this.getFiles();

        files.push({name: fileName, path: filePath});

        this.store.set("files", files);
    }

    removeFile(fileToRemove) {
        let files = this.getFiles();

        files = files.filter(file => {
            return file.path !== fileToRemove;
        });

        this.store.set("files", files);
    }

    getFiles() {
        return this.store.get("files", []);
    }
}