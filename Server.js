var express = require("express");

var http = require("http");
var app = express();
var fs = require("fs");

var ODataServer = require('simple-odata-server');
var Adapter = require('./helpers/AdapterModule');

var downloader = require("./helpers/generate");
var oDataModel = require("./helpers/ODataModel");
var userInit = require("./helpers/user");

app.use(express.static("./"));

const iPort = 4000;

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var compression = require("compression");
app.use(compression());

var cookieSession = require("cookie-session");
app.use(cookieSession({
    keys: ['secret1', 'secret2']
}));

app.get("/DownloadData",(req, res, next) => {
    async function fData() {
        try {
            var fData = await downloader.downloadFiles();
            //res.write(fData.text);
            var fGen = await downloader.generateItems();
            //res.write(fGen.text);
            //res.write(fGen.counter.toString());
            res.send({
                text: "All successfull",
                count: fGen.counter.toString()
            });
        } catch (e) {
            console.log(e);
            res.send("ErrorOnDownload")
        }
    }
    fData();
});

app.get("/getLastUser", (req, res, next) => {
    res.send({name: userInit.getRecent()});
});

app.post("/UserInit", (req, res, next) => {
    var name = req.body.Name;
    async function fUser() {
        try {
            var oUser = await userInit.builUser(name);
            res.send(oUser.text);
        } catch (e) {
            console.log(e);
        }
    }
    fUser();
});

var odataServer = ODataServer("http://localhost:4000/odata")
    .model(oDataModel.getModel())
    .adapter(Adapter(function(es, cb) {} ));

app.use("/odata", (req, res) => {
    if(req.url === "/$metadata?sap-language=DE") {
        // oData Service Metadata
        res.set("Content-Type", "application/xml");
        let fMetadata = (fs.readFileSync("./localService/metadata.xml")).toString();
        res.send(fMetadata);
    } else if (req.url === "/") {
        // oData Service Header
        res.set("Content-Type", "application/json");
        let fHead = JSON.stringify({
            "d" : { "EntitySets" : ["Cards"]}
        });
        res.send(fHead);
    } else {
        odataServer.handle(req, res);
    }
});

//create node.js http server and listen on port
http.createServer(app).listen(iPort, () => {
    console.log("Server running on Port " + iPort);
});

// http.createServer(odataServer.handle.bind(odataServer)).listen(iPort);