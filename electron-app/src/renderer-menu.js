function toggleListening() {

    console.log('Toggle Listening activated');
            
    // console.log('API', window.electronAPI);
    
    window.electronAPI.toggleListen();            
}

function startStopListening() {
        
    console.log('Start/Stop Listening activated');
            
    window.electronAPI.startStopListen();
}

// Note:
// init menu in disabled/hidden state
// show menu items once electron detected in the main webapp
// and microphone and model available in the python app
// main to send enable-menu to show and enable the menu
// main to send disable-menu to revert back to hiding the menu

electronAPI.receiveMessage((message) => {
    console.log('Menu Received from main:', message);
});

// this is unnecessary as main pings each webview b/c external webapp
// doesn't have an equivalent render js (currently).
document.addEventListener('DOMContentLoaded', () => {
    
    console.log('Renderer Menu DOM Loaded.');

    console.log('Renderer Menu calling WebviewReady.');
    
    window.electronAPI.sendWebviewReady();
    
});
