import { app, BrowserWindow } from 'electron';

await app.whenReady();
let window = new BrowserWindow({ width: 800, height: 600 });
window.loadURL('https://github.com');
