const https = require('https');
const fs = require('fs');

const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2QyYzczMWYwNzM1MDQzYmI4ZTYxN2FiNTNiNmMxY2M5EgsSBxDH3s_gwRIYAZIBJAoKcHJvamVjdF9pZBIWQhQxNzY1MTg2MzI5MTYwNTg1NDg3Nw&filename=&opi=89354086';
const dest = 'src/2_partner/dashboard/stitch_dashboard.html';

const file = fs.createWriteStream(dest);

https.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close();
        console.log('Download complete');
    });
}).on('error', function (err) {
    console.error('Error:', err.message);
});
