const { app, BrowserWindow } = require('electron');
const path = require('node:path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (SMOKE_TEST) {
    smokeTest(mainWindow);
    return;
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Headless smoke test (test/smoke.test.js sets QODE_SMOKE_TEST=1): once the page has
// loaded, print what it rendered and exit 0; exit 1 if it fails to load or takes
// longer than 30s. The test runner asserts on the exit code and the printed line.
const SMOKE_TEST = process.env.QODE_SMOKE_TEST === '1';

const smokeTest = (win) => {
  const timer = setTimeout(() => {
    console.error('SMOKE_FAIL timeout waiting for did-finish-load');
    app.exit(1);
  }, 30000);
  win.webContents.once('did-fail-load', (_e, code, desc) => {
    console.error(`SMOKE_FAIL did-fail-load ${code} ${desc}`);
    app.exit(1);
  });
  win.webContents.once('did-finish-load', async () => {
    const heading = await win.webContents.executeJavaScript(
      "document.querySelector('h1')?.textContent ?? ''",
    );
    clearTimeout(timer);
    console.log(`SMOKE_OK title=${JSON.stringify(win.getTitle())} h1=${JSON.stringify(heading)}`);
    app.exit(0);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
