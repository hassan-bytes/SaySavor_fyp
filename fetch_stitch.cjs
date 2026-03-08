const fs = require('fs');
fetch("https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2QyYzczMWYwNzM1MDQzYmI4ZTYxN2FiNTNiNmMxY2M5EgsSBxDH3s_gwRIYAZIBJAoKcHJvamVjdF9pZBIWQhQxNzY1MTg2MzI5MTYwNTg1NDg3Nw&filename=&opi=89354086")
    .then(res => res.text())
    .then(text => fs.writeFileSync('stitch_dashboard.html', text))
    .catch(err => console.error(err));
