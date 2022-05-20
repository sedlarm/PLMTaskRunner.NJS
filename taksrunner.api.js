const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const plmapi = require('./plm.js');
const fs = require('fs');

app.listen(3000, () => console.log('Listening on port 3000...'));

app.post('/api/v1/converttopdf/', 
    bodyparser.raw({
        limit: '10mb', 
        type: 'application/pdf'
    }), 
    (req, res) => {
        let wsId = req.query.wsId;
        let dmsId = req.query.dmsId;
        let fileData = req.body;
        plmapi.login(function() {
            plmapi.getDetails(wsId, dmsId, (data) => {
                console.log("Found ITEM: " + data.title);
                let values = plmapi.parseValues(data);
                
                fs.mkdtemp('tr_', null, (err, folder) => {
                    let fileName = values.CISLO_FAKTURY + ".pdf";
                    let tmpFile = folder + '/' + fileName;
                    console.log("tmp = " + tmpFile);
                    
                    const fd = fs.createWriteStream(tmpFile, {
                        flags: "w+",
                        encoding: "binary"
                    });
                    fd.end(fileData);
                    fd.on('close', () => {
                        plmapi.uploadFile(wsId, dmsId, fileName, null, tmpFile);
                        res.send({status: 'OK'});
                    });
                });
            });
        }); 
    });