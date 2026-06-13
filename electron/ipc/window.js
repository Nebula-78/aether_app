const { ipcMain, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs').promises;

function setupWindowHandlers(store) {
  ipcMain.on('window:minimize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });
  ipcMain.on('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && !win.isDestroyed()) {
      win.isMaximized() ? win.unmaximize() : win.maximize();
    }
  });
  ipcMain.on('window:close', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.handle('window:isMaximized', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return win && !win.isDestroyed() ? win.isMaximized() : false;
  });
}

module.exports = { setupWindowHandlers };
