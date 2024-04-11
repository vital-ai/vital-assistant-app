const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld( 'electronAPI', {
        
        receiveMessage: (callback) => ipcRenderer.on('message-from-main', (event, message) => callback(message)),
    
        sendMessage: (msg) => ipcRenderer.send('menuview-message-to-main', msg),

        sendWebviewReady: () => ipcRenderer.send('webview-ready', 'menuview'),

        toggleListen: () => ipcRenderer.send('toggle-listen'),
    
        startStopListen: () => ipcRenderer.send('start-stop-listen')
    
    }
);

ipcRenderer.on('ping', () => {
    
    console.log("Received PING for menuview");

    ipcRenderer.send('webview-ready', 'menuview');
    
});


