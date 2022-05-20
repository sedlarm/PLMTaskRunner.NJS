const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const plmapi = require('./plm.js');
const fs = require('fs');
const pdf = require('wkhtmltopdf');
const basicAuth = require('express-basic-auth');
 
require('wkhtmltopdf').command = 'C:\\Private\\wkhtmltox\\bin\\wkhtmltopdf.exe';

app.use(basicAuth({
    users: { test 'test123' },
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
                convertToPdf(req.body, fileName, (tmpFile) => {
                    let stats = fs.statSync(tmpFile);
                    if (stats.size > 0 ) {
                        //plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile);
                        res.send({status: 'OK'});
                    } else {
                        res.status(500).send('PDF creation failed');
                    }
                });
            });
        }); 
    });

function convertToPdf(fileData, fileName, callback) {
    let tmpFile = './upload/' + fileName;
    const pdfOptions = { 
        'marginTop'       : '0.5cm',   // default is 0, units: mm, cm, in, px
        'marginRight'     : '0.5cm',
        'marginBottom'    : '0.5cm',
        'marginLeft'      : '0.5cm',
        'encoding': 'utf-8',
        'pageSize' : 'A4', 
        'orientation': 'portrait',
        'debug': false,
        'output': tmpFile
    };    
    pdf(fileData, pdfOptions, (err, stream) => {
        if (err) console.log(err);
        callback(tmpFile);
    });  
}
