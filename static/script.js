const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const fileNameDisplay = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const dashboardGrid = document.getElementById('dashboard-grid');

// Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
    }

    fileNameDisplay.textContent = `Selected: ${file.name}`;
    uploadFile(file);
}

function uploadFile(file) {
    // Show Loading
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    const formData = new FormData();
    formData.append('pdf_file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                resetUI();
            } else {
                showResults(data);
            }
        })
        .catch(err => {
            console.error(err);
            alert('An error occurred during upload.');
            resetUI();
        });
}

function showResults(data) {
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    // Set Download Link
    downloadBtn.href = data.download_url;

    // Render Dashboard
    dashboardGrid.innerHTML = '';
    const preview = data.preview;

    for (const room in preview) {
        const classes = preview[room];

        const card = document.createElement('div');
        card.classList.add('room-card');

        const roomTitle = document.createElement('h4');
        roomTitle.textContent = room;
        card.appendChild(roomTitle);

        // Show first 3 classes as preview
        classes.slice(0, 3).forEach(cls => {
            const item = document.createElement('div');
            item.classList.add('class-item');
            item.innerHTML = `
                <strong>${cls['Day']} ${cls['Start Time']} - ${cls['End Time']}</strong>
                ${cls['Class Info']}
            `;
            card.appendChild(item);
        });

        if (classes.length > 3) {
            const more = document.createElement('div');
            more.classList.add('class-item');
            more.style.fontStyle = 'italic';
            more.textContent = `+${classes.length - 3} more classes`;
            card.appendChild(more);
        }

        dashboardGrid.appendChild(card);
    }
}

function resetUI() {
    loadingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileNameDisplay.textContent = '';
    fileInput.value = '';
}
