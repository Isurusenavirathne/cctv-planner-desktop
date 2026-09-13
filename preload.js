const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  saveFile: (defaultName, content) => ipcRenderer.invoke('save-file', defaultName, content),
  openFile: () => ipcRenderer.invoke('open-file'),
  savePNG: (defaultName, dataUrl) => ipcRenderer.invoke('save-png', defaultName, dataUrl),
  saveCSV: (defaultName, content) => ipcRenderer.invoke('save-csv', defaultName, content),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action))
});