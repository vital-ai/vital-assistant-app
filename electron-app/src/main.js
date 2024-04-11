const { app, session, BrowserWindow, ipcMain, Menu, webContents } = require('electron');

const { Worker } = require('worker_threads');

const path = require('path');

app.setName('Vital Assistant');

const menuTemplate = [
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            { role: 'close' }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'Learn More',
                click: async () => {
                    const { shell } = require('electron');
                    await shell.openExternal('https://www.chat.ai');
                }
            }
        ]
    }
];

if (process.platform === 'darwin') {
    menuTemplate.unshift({
        label: app.getName(),
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    });

    // Edit menu for macOS
    menuTemplate[1].submenu.push(
        { type: 'separator' },
        { label: 'Speech', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }
    );

    // Window menu for macOS
    menuTemplate[3].submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
    ];
}

function sendMessageToWebview(webContentsId, message) {
    const wc = webContents.fromId(webContentsId);
    if (wc) {
        wc.send('message-from-main', message);
    } else {
        console.error('No webContents found with id:', webContentsId);
    }
}

const menuViewKey = 'menuview';

const mainViewKey = 'mainview';

let webContentsMap = new Map();

let mainWindow;

function findWebContentsById(webContentsList, id) {
    return webContentsList.find(wc => wc.id === id);
}

function createWindow() {
    
    const vitalSession = session.fromPartition('persist:name');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            webviewTag: true, 
            preload: path.join(__dirname, 'preload-index.js'),
            webSecurity: true,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true,
                        
            session: vitalSession
        }
    });

    // Listen for when the window finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
        
        // console.log('Page loaded!');
        
        // Additional logic can be implemented here if needed,
        // such as re-injecting certain JavaScript if the page is the logged-in page.
    
    });
    
    mainWindow.webContents.on('did-navigate', (event, url) => {
        
        console.log('Navigated to:', url);
        
        // TODO check to see is this is the logged in webapp
        // and if so, enable the menu
            
    });
    
    ipcMain.on('toggle-listen', (event) => {
        
        console.log('Toggle listening');
         
        const allWebContents = webContents.getAllWebContents();
       
        let menuViewWebContentsId = webContentsMap.get(menuViewKey);

        let menuViewWebContents = findWebContentsById(allWebContents, menuViewWebContentsId);

        menuViewWebContents.send('message-from-main', 'enable-menu');
        
        menuViewWebContents.send('message-from-main', 'disable-menu');

    });

    ipcMain.on('start-stop-listen', (event) => {
        
        console.log('Start/Stop listening');
        
        const allWebContents = webContents.getAllWebContents();
        
        let mainViewWebContentsId = webContentsMap.get(mainViewKey);
        
        let mainViewWebContents = findWebContentsById(allWebContents, mainViewWebContentsId);
        
        let text = 'Hello, world!';

        mainViewWebContents.send('send-text-message', text);
        // instead of this
        // invoke-handle-electron-text could be called directly
        // but sending to preload-main allows any processing to be put
        // there before calling the handler in the webapp
        
        
    });
        
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    mainWindow.on('closed', () => mainWindow = null);
    
    // mainWindow.webContents.openDevTools();
    
    
    
    ipcMain.on('webview-ready', (event, webViewId) => {
    
        // console.log("event: ", event);
        
        const webviewWebContents = event.sender;
        
        console.log("webview div id: ", webViewId);

        console.log('WebContents ID for webview:', webviewWebContents.id);
        
        webContentsMap.set(webViewId, webviewWebContents.id);
        
    });
    
    ipcMain.on('invoke-handle-electron-text', (event, text) => {
        
        const allWebContents = webContents.getAllWebContents();
        
        let mainViewWebContentsId = webContentsMap.get(mainViewKey);
        
        let mainViewWebContents = findWebContentsById(allWebContents, mainViewWebContentsId);
       
        // TODO check for electron integration in webapp
        // webapp includes:
        /*
        
        document.addEventListener('DOMContentLoaded', function () {
   
            if (typeof window.electronAPI !== 'undefined') {
        
                // window.electronAPI.sendText("Hello from the webpage!");
        
                console.log("ElectronAPI detected.");
            }
            else {
        
                console.log("ElectronAPI NOT detected.");
            }
        */
        
        
        mainViewWebContents.executeJavaScript(`handleElectronText("${text}");`).catch(err => console.log(err));

    });
     
}


const worker = new Worker('./src/ws_worker.js');

async function openWebSocket(url) {
    worker.postMessage({ command: 'open', url: url });
}

function closeWebSocket() {
    worker.postMessage({ command: 'close' });
}


// disable checking cert for local testing
app.on('ready', () => {
  session.defaultSession.setCertificateVerifyProc((request, callback) => {
    callback(0) // 0 means certificates are accepted automatically
  })
})


function waitForWebSocketOpen() {
    
    return new Promise((resolve, reject) => {
        worker.on('message', (msg) => {
            if (msg.type === 'open') {
                console.log(msg.message);  // "WebSocket is open"
                resolve();
            } else if (msg.type === 'error') {
                reject(new Error(msg.message));
            }
        });
    });
}

async function setupWebSocket() {
    try {
        worker.postMessage({ command: 'open', url: 'ws://localhost:6060/ws' });
        await waitForWebSocketOpen();
        console.log('WebSocket is now open and ready for messages.');
        // Now send a message or do other tasks
        // worker.postMessage({ command: 'send', data: 'Hello server!' });
    } catch (error) {
        console.error('Error setting up WebSocket:', error);
    }
}


app.whenReady().then( async () => {
    
    app.setAboutPanelOptions({
        applicationName: app.getName(),
        applicationVersion: '0.1.0', 
        version: 'Build 1001',
        credits: 'Developed by Vital.ai',
        authors: ['Marc Hadfield'],
        website: 'https://www.vital.ai',
        copyright: 'Copyright © 2024 Vital AI, LLC. All Rights Reserved.'
    });
    
    const menu = Menu.buildFromTemplate(menuTemplate);
    
    Menu.setApplicationMenu(menu);
            
    createWindow();

    worker.on('message', (msg) => {
        
        console.log('Message from WebSocket:', msg);

        
        if (msg.type === 'message') {
            console.log('Message from WebSocket:', msg.data);
        } else if (msg.type === 'status') {
            console.log(`WebSocket is now ${msg.message}`);
        } else if (msg.type === 'error') {
            console.error('WebSocket error:', msg.error);
        }
    });
            
    await setupWebSocket();

    const data = [
        {
            "type": "ping"
        }
    ];
    
    const jsonString = JSON.stringify(data);

    worker.postMessage({ command: 'send', data: jsonString });


     
});

app.on('web-contents-created', (event, contents) => {
    
        // console.log("web contents created: ", contents.getType());

        if (contents.getType() === 'webview') {
            
            contents.on('did-finish-load', () => {
                
                // console.log('Webview did finish loading its content');

                // console.log("web contents: ", contents);

                // contents.openDevTools();
                
                // console.log('getWebContentsId(): ', contents.getWebContentsId());
                
                // console.log('getURL(): ', contents.getURL());

                contents.send('ping');
                
                // contents.executeJavaScript('console.log("hello from main!")');
                
                // contents.executeJavaScript('handleElectronText("How are you today?")');
                
            });
        }
    });

app.on('window-all-closed', () => {
     
    if (process.platform !== 'darwin') {
        // app.quit();
    }
    
    app.quit();
    
});
