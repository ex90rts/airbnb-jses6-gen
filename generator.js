var fs = require('fs');
var path = require('path');
var co = require('co');
var marked = require('marked');
var sqlite3 = require('sqlite3').verbose();
var wrench = require('wrench');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

var docsList = [
    "docs/eslint/docs/rules/",
    "docs/eslint-plugin-import/docs/rules/",
    "docs/eslint-plugin-jsx-a11y/docs/rules/",
    "docs/eslint-plugin-react/docs/rules/"
];
var docsRoot = 'AirbnbJsEs6.docset/Contents/Resources/Documents/';

var idxItems = [];
for (var i = 0; i < docsList.length; i++) {
    var dir = docsList[i];
    var docName = dir.split('/')[1].replace('eslint-plugin-', '');
    var files = wrench.readdirSyncRecursive(dir);
    for (var j = 0; j < files.length; j++) {
        var it = files[j];
        if (it.substring(0, 1) === '.') {
            continue;
        }

        var filepath = path.join(dir, it);
        var stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            continue;
        }

        var htmlDir = docsRoot + docName;
        if (!fs.existsSync(htmlDir)) {
            fs.mkdirSync(htmlDir);
        }

        var content = fs.readFileSync(filepath, {
            encoding: 'utf8'
        });

        if (!content) {
            continue;
        }

        var markedContent = marked(content);

        // enhancements for eslint offcial style
        markedContent = markedContent.replace(/<p>.*?<strong>(incorrect|correct)<\/strong>.*?<\/p>/gm, function(hit, k) {
            if (k === 'correct') {
                return hit.replace('<p>', '<p class="correct icon">');
            }

            if (k === 'incorrect') {
                return hit.replace('<p>', '<p class="incorrect icon">');
            }

            return hit;
        });

        markedContent = markedContent.replace(/<p>.*?<code>--fix<\/code>.*?<\/p>/gm, function(hit, k) {
            return hit.replace('<p>', '<p class="fixable icon">');
        });

        markedContent = markedContent.replace(/<p>.*?<strong>removed<\/strong>.*?<\/p>/gm, function(hit, k) {
            return hit.replace('<p>', '<p class="removed icon">');
        });

        markedContent = markedContent.replace(/<a href="(.*?).md">/gm, function(hit, k) {
            return hit.replace('.md', '.html');
        });

        var htmlArray = [
            '<!-- single file version -->',
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<link href="../assets/eslint.css" rel="stylesheet" type="text/css">',
            '<link href="../assets/xcode.min.css" rel="stylesheet" type="text/css">',
            '<script src="../assets/highlight.min.js"></script>',
            '</head>',
            '<body>',
            markedContent,
            '<script>hljs.initHighlightingOnLoad();</script>',
            '</body>',
            '</html>',
        ];
        var htmlFilename = it.replace('.md', '.html');
        var html = htmlArray.join('\n');
        fs.writeFileSync(htmlDir + '/' + htmlFilename, html, 'utf8');
        var idxName = docName + '/' + it.replace('.md', '');
        idxItems.push({
            name: idxName,
            type: 'Guide',
            path: docName + '/' + htmlFilename
        });
    }
}

var db = new sqlite3.Database('AirbnbJsEs6.docset/Contents/Resources/docSet.dsidx');
db.serialize(function() {
    db.run("DROP TABLE searchIndex");
    db.run("CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT)");
    db.run("CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path)");

    var stmt = db.prepare("INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ($name, $type, $path)");
    for (var i = 0; i < idxItems.length; i++) {
        var item = idxItems[i];
        stmt.run({
            $name: item['name'],
            $type: item['type'],
            $path: item['path'],
        }, function(err) {
            if (err) {
                console.log(err);
            }
        });
    }
    stmt.finalize();
});
db.close();

fs.createReadStream('./assets/eslint.css').pipe(fs.createWriteStream('AirbnbJsEs6.docset/Contents/Resources/Documents/assets/eslint.css'));
fs.createReadStream('./assets/xcode.min.css').pipe(fs.createWriteStream('AirbnbJsEs6.docset/Contents/Resources/Documents/assets/xcode.min.css'));
fs.createReadStream('./assets/highlight.min.js').pipe(fs.createWriteStream('AirbnbJsEs6.docset/Contents/Resources/Documents/assets/highlight.min.js'));
fs.createReadStream('./assets/glyphicons-halflings-regular.woff').pipe(fs.createWriteStream('AirbnbJsEs6.docset/Contents/Resources/Documents/assets/glyphicons-halflings-regular.woff'));
fs.createReadStream('./Info.plist').pipe(fs.createWriteStream('AirbnbJsEs6.docset/Contents/Info.plist'));
fs.createReadStream('./icon.png').pipe(fs.createWriteStream('AirbnbJsEs6.docset/icon.png'));