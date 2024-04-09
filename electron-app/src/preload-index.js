const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    receiveMessage: (callback) => {
            ipcRenderer.on('execute-in-webview-main', (event, data) => {
                console.log("Data received in webview:", data);
                callback(data);  
            });
        },
    
});


window.addEventListener('DOMContentLoaded', () => {
    
  // console.log("preload index dom loaded");
    
  // const webview = document.querySelector('#mainView');
  
  // console.log("main webview: ", webview);
    
   
    /*
  if (webview) {
      
    webview.addEventListener('dom-ready', () => {
      
      // ipcRenderer.send('webview-info', { webContentsId: webview.getGuestInstanceId(), divId: webview.id });
        
    });
  }
  */
    
    
    
});


