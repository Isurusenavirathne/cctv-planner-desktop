const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  Menu.setApplicationMenu(buildAppMenu(mainWindow));

  // Warn on close if there are unsaved changes (renderer tracks a "dirty" flag)
  mainWindow.on('close', async (e) => {
    const isDirty = await mainWindow.webContents.executeJavaScript('window.__isDirty === true').catch(() => false);
    if (isDirty) {
      e.preventDefault();
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Save & Close', 'Close Without Saving', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'You have unsaved changes.',
        detail: 'Do you want to save your project before closing?'
      });
      if (response === 0) {
        await mainWindow.webContents.executeJavaScript('ProjectIO.exportJSON()').catch(() => {});
        mainWindow.destroy();
      } else if (response === 1) {
        mainWindow.destroy();
      }
      // response === 2 (Cancel) -> do nothing, window stays open
    }
  });
}

function buildAppMenu(win) {
  return Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+Shift+N', click: () => win.webContents.send('menu-action', 'new-project') },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('menu-action', 'save-project') },
        { label: 'Open Project', accelerator: 'CmdOrCtrl+O', click: () => win.webContents.send('menu-action', 'open-project') },
        { type: 'separator' },
        { label: 'Export PNG', click: () => win.webContents.send('menu-action', 'export-png') },
        { label: 'Export BOM CSV', click: () => win.webContents.send('menu-action', 'export-csv') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => win.webContents.send('menu-action', 'undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => win.webContents.send('menu-action', 'redo') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => win.webContents.send('menu-action', 'zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => win.webContents.send('menu-action', 'zoom-out') },
        { label: 'Reset Zoom', click: () => win.webContents.send('menu-action', 'zoom-reset') },
        { label: 'Fit to Screen', click: () => win.webContents.send('menu-action', 'fit-screen') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'reload' }
      ]
    }
  ]);
}

/* ---------------------------------------------------------
   FILE I/O — native Save/Open dialogs
   --------------------------------------------------------- */
ipcMain.handle('save-file', async (event, defaultName, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'JSON Project', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { success: true, path: filePath };
});

ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON Project', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || filePaths.length === 0) return { success: false };
  const content = fs.readFileSync(filePaths[0], 'utf-8');
  return { success: true, content, path: filePaths[0] };
});

ipcMain.handle('save-png', async (event, defaultName, dataUrl) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'PNG Image', extensions: ['png'] }]
  });
  if (canceled || !filePath) return { success: false };
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(filePath, base64, 'base64');
  return { success: true, path: filePath };
});

ipcMain.handle('save-csv', async (event, defaultName, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'CSV File', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, content, 'utf-8');
  return { success: true, path: filePath };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});