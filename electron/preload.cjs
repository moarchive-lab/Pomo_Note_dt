const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pomoNote", {
  getVersion: () => ipcRenderer.invoke("app-version")
});
