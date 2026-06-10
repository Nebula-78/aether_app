const { ipcMain, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs').promises;

function setupWindowHandlers(store) {
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender).minimize());
  ipcMain.on('window:maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender).close());

  ipcMain.handle('window:isMaximized', (e) => 
    BrowserWindow.fromWebContents(e.sender).isMaximized()
  );
}

module.exports = { setupWindowHandlers };
