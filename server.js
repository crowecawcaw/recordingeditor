//A super simple express server to test the script
var express = require('express');
var app = express();

app.use('/', express.static(__dirname));
app.listen(3000, function() { console.log('listening at 3000')});

