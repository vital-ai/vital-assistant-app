const { parentPort } = require('worker_threads');

const WebSocket = require('ws');

// add parameters for handlers to be passed in?

let ws;

const decoder = new TextDecoder('utf-8');

function openWebSocket(url) {
        
        ws = new WebSocket(url);
    
        ws.on('message', (data) => {
        
            console.log('Received:', data);
        
            const text = decoder.decode(data);

            const json = JSON.parse(text);

            parentPort.postMessage({ type: 'message', data: json });
        
        });
    
        ws.on('open', () => {
            
            console.log('WebSocket connection established');
            
            parentPort.postMessage({ type: 'open', message: 'WebSocket is open' });

        });
    
        ws.on('error', (error) => {
            
            console.error('Failed to open WebSocket', error);
            
            parentPort.postMessage({ type: 'error', message: 'WebSocket encountered an error', error });

        });     
         
        ws.on('close', (event) => {
            
            console.error('WebSocket closed unexpectedly', event);
            
            parentPort.postMessage({ type: 'close', message: 'WebSocket connection closed' });

        });     
}

function closeWebSocket() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Closing connection normally.');
    }
}

parentPort.on('message', (msg) => {
    switch (msg.command) {
        case 'open':
            openWebSocket(msg.url);
            break;
        case 'close':
            closeWebSocket();
            break;
        case 'send':
            console.log('WebSocket sending:', msg.data);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg.data);
            }
            break;
        default:
            console.log('Unknown command');
    }
});

