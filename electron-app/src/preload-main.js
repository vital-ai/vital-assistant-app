const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'electronAPI', {
        
        sendWebviewReady: () => ipcRenderer.send('webview-ready', 'mainview'),
        
        receiveMessage: (callback) => ipcRenderer.on('message-from-main', (event, message) => callback(message)),

        sendMessage: (msg) => ipcRenderer.send('mainview-message-to-main', msg)
    }
);

ipcRenderer.on('ping', () => {
    
    console.log("Received PING for mainview");

    ipcRenderer.send('webview-ready', 'mainview');
    
});

ipcRenderer.on('send-text-message', (event, text) => {
    
    console.log("Received Text Message: ", text);

    ipcRenderer.send('invoke-handle-electron-text', text);

});
