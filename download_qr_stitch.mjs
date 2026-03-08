import https from 'https';
import fs from 'fs';

const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzY4N2I2YThlZDk0ZDRiOTNhNDk1MjM2NGVkN2IxZmM0EgsSBxDH3s_gwRIYAZIBIwoKcHJvamVjdF9pZBIVQhMxMDQ5NDU2MzgwNjY5MjMwMTQw&filename=&opi=89354086';
const dest = 'stitch_qr_builder.html';

console.log('Starting download from:', url);
const file = fs.createWriteStream(dest);

https.get(url, function (response) {
    console.log('Response Status:', response.statusCode);
    if (response.statusCode !== 200) {
        console.error(`Failed to download: ${response.statusCode} ${response.statusMessage}`);
        process.exit(1);
        return;
    }
    response.pipe(file);
    file.on('finish', function () {
        file.close();
        console.log('Download complete to:', dest);
    });
}).on('error', function (err) {
    console.error('Error:', err.message);
    process.exit(1);
});
