
const f = require('./futurefarming/functions.js'); 
const fs = require('fs');
require('wkhtmltopdf').command = 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

let wsId = 274;
let dmsId = 14349;
let transId = ''; //'ODESLAT_DO_ABBRA';


fs.readFile('./upload/test2.html', 'utf8', (err, data) => {
    if (!err) {
        f.htmlToPdf(wsId, dmsId, data, (err, pdfData) => {
            if (err) {
                console.error('Error: ' + err);
            } else {
                console.log('PDF conversion finished');
                let resObj = {
                    status: 'ok',
                    file: {
                        mime: "@file/pdf",
                        data: pdfData
                    }
                };
                //console.log(resObj);
                if (transId) {
                    f.callTransition(wsId, dmsId, transId);
                }                
            }
        });    
    } else {
        console.error(err.message);
    }
});