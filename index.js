var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

//placeholders for added task
var task = ["buy socks", "practise with nodejs"];

app.get("/", function(req, res) {
    res.render("index", { task: task });
});


app.listen(3000, function() {
    console.log("server is running on port 3000");
});