const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const plmapi = require('./plm.js');
const config = require('./config.js');
const fs = require('fs');
const pdf = require('wkhtmltopdf');
const basicAuth = require('express-basic-auth');
 
require('wkhtmltopdf').command = config.wkhtmltopdf.path;
require('./plm.js').config = config;

app.use(basicAuth({
    users: config.api.basicAuth.users,
    challenge: false // <--- needed to actually show the login dialog!
}));

app.listen(3000, () => console.log('Listening on port 3000...'));

app.post('/api/v1/converttopdf/', 
    bodyparser.text({type: '*/*'}), 
    (req, res) => {
        let wsId = req.query.wsId;
        let dmsId = req.query.dmsId;
        plmapi.login(function() {
            plmapi.getDetails(wsId, dmsId, (data) => {
                console.log("Found ITEM: " + data.title);
                let values = plmapi.parseValues(data);
                let fileName = values.CISLO_FAKTURY + ".pdf";
                convertToPdf(req.body, fileName, config.wkhtmltopdf.templates.faktura, (tmpFile) => {
                    let stats = fs.statSync(tmpFile);
                    console.log('PDF taks finished: ' + Math.round(stats.size/1024) + " KB");                    
                    if (stats.size > 0 ) {
                        plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile);
                        fs.unlink(tmpFile, (err) => {
                            if (err) {
                                console.log("remove file failed: " + err.message);
                            }
                
                            res.send({status: 'OK'});
                        });
                    } else {
                        res.status(500).send('PDF creation failed');
                    }
                });
            });
        }); 
    });

function sanitizeHtml(html, absoluteUrl) {
    return html.replaceAll(/(baseUrl:\s*\'|src=\"|src=\'|href=\")(\/)/g, '$1' + absoluteUrl);
}

function convertToPdf(fileData, fileName, pdfOptions, callback) {
    //TODO: create temp file in TEMP dir insead
    let tmpFile = './upload/' + fileName;

    pdfOptions.debug = false;
    pdfOptions.quiet = true;
    pdfOptions.output = tmpFile;
    //causing blank first page
    //pdfOptions.enableLocalFileAccess = 'None';
    pdfOptions.loadErrorHandling = 'ignore';

    pdf(sanitizeHtml(fileData, config.plm.url), 
        pdfOptions, 
        (err, stream) => {
            if (err) console.log(err.message);
            callback(tmpFile);
    });  
}
