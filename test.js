const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const plmapi = require('./plm.js');
const config = require('./config.js');
const fs = require('fs');
const pdf = require('wkhtmltopdf');
const basicAuth = require('express-basic-auth');
const plm = require('./plm.js');
const temp = require('temp').track();
 
require('wkhtmltopdf').command = config.wkhtmltopdf.path;
require('./plm.js').config = config;

let wsId = 274;
let dmsId = 14349;
let transId = 1;
plmapi.login(function() {
    plmapi.getDetails(wsId, dmsId, (data) => {
        console.log("Found ITEM: " + data.title);
        /*
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
        */
                    if (transId) {
                        plmapi.getTransitions(wsId, dmsId, (tdata) => {
                            var transitions = plmapi.parseTransitions(tdata);
                            var trans = null;
                            if (trans = Object.values.find(element => element.transitionID == transId)) {
                                let step = tdata.currentStep + 1;
                                let comment = 'run by PLMTaskRunner service';
                                console.log('Calling transition ' + trans.transitionID + ',' + step);
                                //plmapi.transition(wsId, dmsId, trans.transitionID, step, comment);
                            }
                        });
                    }
        /*
                });
            } else {
                res.status(500).send('PDF creation failed');
            }
        });
        */
    })
});
