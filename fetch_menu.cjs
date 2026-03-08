const fs = require('fs');
const https = require('https');

async function download() {
    console.log("Downloading HTML...");
    // use dynamic import for fetch since it's global in new node or node-fetch
    const resHtml = await fetch("https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzdlMWUwOTdmNzIxMDRjMWRhZWI3MWFlMjgxYjE1Nzg3EgsSBxDH3s_gwRIYAZIBIwoKcHJvamVjdF9pZBIVQhMxMDQ5NDU2MzgwNjY5MjMwMTQw&filename=&opi=89354086");
    const htmlText = await resHtml.text();
    fs.writeFileSync('menu_stitch.html', htmlText);
    console.log("HTML Downloaded!");
}

download().catch(console.error);
