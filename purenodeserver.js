const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // serve css

    if (req.url.startsWith('/public/')) {
        const filePath = path.join(__dirname, req.url);
        const ext = path.extname(filePath);

        let contentType;

        switch (ext) {
            case '.css':
                contentType = 'text/css';
                break;
            
            case '.js':
                contentType = 'application/javascript';
                break;
            
            case '.json':
                contentType = 'application/json';
                break;
            default:
                break;
        }



        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            res.writeHead(200, { 'Content-Type' : contentType });
            res.end(content);
        });
        return;
    }


    if (req.url === '/' || req.url === './index.html') {
        const baseHTML = fs.readFileSync('./index.html', 'utf8');
        const testerHTML = fs.readFileSync('./components/tester.html', 'utf8');

        const finalHTML = baseHTML
            .replace('{{tester}}', testerHTML);
        
        res.writeHead(200, { 'Content-Type' : 'text/html'});
        res.end(finalHTML);
        return;
    }

    res.writeHead(404);
    res.end('404 Not Found');

});

server.listen(PORT, () => {
    console.log(`Server running at localhost:${PORT}`);
})