let sleep = function(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

let fileBrowse = function (evt) {
    let target = evt.target

    target = target.parentElement
    target = target.parentElement

    let input = target.querySelector('input[type="file"]')

    input.click()
}

let fileRead = async function (event) {
    let input = event.target;

    let location = window.location

    let template = document.querySelector('#shell-line')
    let container = document.querySelector('.shell-output')

    for (let file of input.files) {
        let element = document.importNode(template.content, true)
        let elements = container.childNodes

        let shellLine = element.querySelector('.shell-line:nth-child(2)')
        let shellFileInfo = element.querySelector('.shell-file-info')
        let shellFileName = element.querySelector('.shell-file-name')
        let shellFilePush = element.querySelector('.shell-file-push')
        let shellFileLink = element.querySelector('.shell-file-link a')

        let fileName = file.name
        let filePush = location.origin + '/storage/' + fileName

        shellFileName.innerText = fileName
        shellFilePush.innerText = filePush

        container.insertBefore(element, elements[elements.length - 2])

        container.scrollTo(0, container.scrollHeight)

        await sleep(1000)

        let request = new XMLHttpRequest()

        request.addEventListener('load', function (event) {
            let classList = shellLine.classList

            classList.toggle('shell-active')

            if (request.status >= 200 && request.status < 300) {
                console.log(request.statusText, request.responseText)

                shellFileInfo.innerText = 'okay (' + request.status + ')'

                classList.toggle('shell-upload')

                let fileCode = request.responseText

                shellFileLink.href = fileCode
                shellFileLink.innerText = fileCode
            } else {
                console.warn(request.statusText, request.responseText)

                shellFileInfo.innerText = 'failed (' + request.status + ')'

                classList.toggle('shell-failed')
            }
        })

        request.open("PUT", filePush)
        request.send(file)
    }
}

document.addEventListener('readystatechange', function () {
    let location = window.location

    let filePush = location.origin + '/storage/' + '$filename'

    if (document.readyState == 'complete') {
        let element = document.querySelector('[data-init]')

        while (element) {
            let dataset = element.dataset

            switch (dataset.init) {
                case "url": 
                    element.innerText = filePush
                    break
            }

            delete dataset.init

            element = document.querySelector('[data-init]')
        }

    }
})
