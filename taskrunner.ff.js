const express = require('express');
const bodyparser = require('body-parser');
const app = express();
const basicAuth = require('express-basic-auth');
const f = require('./futurefarming/functions.js'); 

app.use(basicAuth({
    users: f.config.api.basicAuth.users,
    challenge: false // <--- needed to actually show the login dialog!
}));

app.listen(3000, () => console.log('Listening on port 3000...'));

app.post('/api/v1/converttopdf/', 
    bodyparser.text({type: '*/*'}), 
    (req, res) => {
        let wsId = req.query.wsId;
        let dmsId = req.query.dmsId;
        let transId = req.query.transId;
        let fileName = req.query.fileName;
        //PLM task runner task ID (dmsId) in PLM
        let taskId = req.query.taskId;
        let options = {
            wsId: wsId,
            dmsId: dmsId,
            fileName: fileName,
            encoding: 'base64',
            template: f.config.wkhtmltopdf.templates.faktura,
            htmlTemplate: "\\pdftemplates\\faktura.html",
        }
        f.htmlToPdf(req.body, options, (err, pdfData) => {
            if (err) {
                console.log('Error: ' + err);
                res.status(500).send('PDF creation failed');
            } else {
                console.log('PDF conversion finished');
                let resObj = {
                    status: 'ok',
                    file: {
                        mime: "@file/pdf",
                        data: pdfData
                    }
                };
                res.send(resObj);
                if (transId) {
                    f.callTransition(wsId, dmsId, transId);
                }                
            }
        });
    }
);
