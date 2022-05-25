
const f = require('./functions.farmia.js'); 
const fs = require('fs');
const f = require('./futurefarming/functions.js'); 

let wsId = 274;
let dmsId = 14349;
let transId = 'ODESLAT_DO_ABBRA';


fs.readFile('./upload/test2.html', 'utf8', (err, data) => {
    if (!err) {
        f.htmlToPdf(wsId, dmsId, data, (err2) => {
            if (err) {
                console.log('Error: ' + err2);
                //res.status(500).send('PDF creation failed');
            } else {
                //res.send({status: 'OK'});
                if (transId) {
                    //f.callTransition(wsId, dmsId, transId);
                }                
            }
        });
    }
});