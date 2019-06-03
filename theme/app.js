(function () {
    let Component = {
    }
    // inject manifest
    var importTag = document.createElement('link');
    importTag.setAttribute('rel', 'manifest');
    importTag.setAttribute('href', '/-/theme/manifest.json');
    document.head.appendChild(importTag);
    return Component
}())
