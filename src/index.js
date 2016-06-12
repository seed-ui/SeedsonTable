import {app, BrowserWindow, Menu} from 'electron';

let main_window = null;

app.on('window-all-closed', () => app.quit());

app.on('ready', () => {
  main_window = new BrowserWindow({width: 1200, height: 720, frame: true});
  main_window.setTitle('SeedsonTable');
  main_window.loadURL('file://' + __dirname + '/index.html');
  main_window.on('closed', () => main_window = null);
  main_window.setMenu(null);
});
