const express = require('express');
const fs = require('fs');
const app = express();

const plmapi = require('./plm.js');

plmapi.login(function() {
    plmapi.getDetails(703, 17948, (data) => {
        plmapi.getDetailsGrid(703, 17948, (grid) => {
            let values = plmapi.parseValues(data);
            console.log("Found ITEM: " + data.title);
            console.log(" dodavatel = " + values.DODAVATEL);
            console.log(" dodavatel.ico = " + values.DOD_ICO);
    
            let rows = plmapi.parseGridValues(grid);
            for (row of rows) {
                console.log(" [produkt =" + row.PRODUKT + ", cena = " + row.CELKEM_S_DPH + "]");
            }
        });
    });
    //plmapi.uploadFile(703, 17948,"faktura.pdf", null, './upload/test3.pdf');
});
