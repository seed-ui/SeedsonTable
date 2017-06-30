/// <reference types="node" />
import {app, BrowserWindow} from 'electron';
import * as path from "path";
import * as url from "url";

let mainWindow;

app.on('window-all-closed', () => app.quit());

app.on('ready', () => {
  mainWindow = new BrowserWindow({width: 1200, height: 720, frame: false});
  mainWindow.setTitle('SeedsonTable');
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file",
    slashes: true,
  }));
  mainWindow.on('closed', () => mainWindow = null);
  mainWindow.setMenu(null as any);
  // mainWindow.webContents.openDevTools();
});
