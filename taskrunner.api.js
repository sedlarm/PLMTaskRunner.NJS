const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const plmapi = require('./plm.js');
const config = require('./config.js');
const fs = require('fs');
const pdf = require('wkhtmltopdf');
const basicAuth = require('express-basic-auth');
 
require('wkhtmltopdf').command = config.wkhtmltopdf.path;

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
                    if (stats.size > 0 ) {
                        //plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile);
                        //fs.unlink(tnpFile);
                        res.send({status: 'OK'});
                    } else {
                        res.status(500).send('PDF creation failed');
                    }
                });
            });
        }); 
    });

function convertToPdf(fileData, fileName, pdfOptions, callback) {
    let tmpFile = './upload/' + fileName;
    
    pdfOptions.debug = false;
    pdfOptions.silent = true;
    pdfOptions.output = tmpFile;

    pdf(fileData, pdfOptions, (err, stream) => {
        if (err) console.log(err.message);
        callback(tmpFile);
    });  
}
