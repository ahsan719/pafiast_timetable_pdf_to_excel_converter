// ===================================================================
//  TIMELY — Frontend Logic
// ===================================================================

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const fileNameDisplay = document.getElementById('file-name');
const downloadBtn = document.getElementById('download-btn');
const dashboardGrid = document.getElementById('dashboard-grid');

// =================== NAVBAR SCROLL ===================
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// =================== DRAG & DROP ===================
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

// =================== FILE HANDLING ===================
function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file.', 'error');
        return;
    }

    fileNameDisplay.textContent = `📄 ${file.name}`;
    uploadFile(file);
}

function uploadFile(file) {
    // Switch to loading state
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');

    // Scroll to converter section so user sees progress
    document.getElementById('converter').scrollIntoView({ behavior: 'smooth' });

    const formData = new FormData();
    formData.append('pdf_file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showToast('Error: ' + data.error, 'error');
                resetUI();
            } else {
                showResults(data);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('An error occurred during upload.', 'error');
            resetUI();
        });
}

// =================== RESULTS ===================
function showResults(data) {
    loadingSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    // Set Download Link
    downloadBtn.href = data.download_url;
    downloadBtn.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = data.download_url;
    });

    // Render spreadsheet-style preview tables
    renderSpreadsheetPreview(data.preview);

    // Wire up the preview toggle button
    const toggleBtn = document.getElementById('toggle-preview-btn');
    const previewSection = document.getElementById('preview-section');
    let previewVisible = false;

    toggleBtn.addEventListener('click', () => {
        previewVisible = !previewVisible;
        if (previewVisible) {
            previewSection.classList.remove('hidden');
            toggleBtn.innerHTML = '<i data-lucide="eye-off"></i> Hide Data Preview';
        } else {
            previewSection.classList.add('hidden');
            toggleBtn.innerHTML = '<i data-lucide="eye"></i> View Data Preview';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Re-init lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// =================== SPREADSHEET PREVIEW ===================
function renderSpreadsheetPreview(preview) {
    dashboardGrid.innerHTML = '';

    const dayOrder = ['Mo', 'Tu', 'We', 'Th', 'Fr'];
    const dayNames = { 'Mo': 'Monday', 'Tu': 'Tuesday', 'We': 'Wednesday', 'Th': 'Thursday', 'Fr': 'Friday' };

    for (const room in preview) {
        const classes = preview[room];

        // Create room block
        const roomBlock = document.createElement('div');
        roomBlock.classList.add('room-table-block');

        // Room header (clickable toggle)
        const roomHeader = document.createElement('div');
        roomHeader.classList.add('room-table-header');
        roomHeader.innerHTML = `
            <span class="room-table-icon">📋</span>
            <span class="room-table-title">${room}</span>
            <span class="room-table-count">${classes.length} classes</span>
            <span class="room-table-chevron">▾</span>
        `;
        roomHeader.style.cursor = 'pointer';
        roomBlock.appendChild(roomHeader);

        // Group classes by day
        const byDay = {};
        classes.forEach(cls => {
            const day = cls['Day'] || 'Other';
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(cls);
        });

        // Build table
        const table = document.createElement('table');
        table.classList.add('timetable');

        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="th-day">Day</th>
                <th class="th-time">Time</th>
                <th class="th-class">Class / Subject</th>
            </tr>
        `;
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');

        dayOrder.forEach(day => {
            if (!byDay[day]) return;

            // Sort by start time
            byDay[day].sort((a, b) => (a['Start Time'] || '').localeCompare(b['Start Time'] || ''));

            byDay[day].forEach((cls, idx) => {
                const tr = document.createElement('tr');

                // Day cell — only show on first row for that day (row span effect via CSS)
                const tdDay = document.createElement('td');
                tdDay.classList.add('td-day');
                if (idx === 0) {
                    tdDay.textContent = dayNames[day] || day;
                    tdDay.rowSpan = byDay[day].length;
                    tdDay.classList.add('td-day-label');
                    tr.appendChild(tdDay);
                }

                // Time cell
                const tdTime = document.createElement('td');
                tdTime.classList.add('td-time');
                tdTime.textContent = `${cls['Start Time']} – ${cls['End Time']}`;
                tr.appendChild(tdTime);

                // Class info cell
                const tdClass = document.createElement('td');
                tdClass.classList.add('td-class');
                tdClass.textContent = cls['Class Info'] || '—';
                tr.appendChild(tdClass);

                tbody.appendChild(tr);
            });
        });

        table.appendChild(tbody);
        roomBlock.appendChild(table);

        // Toggle collapse on header click
        roomHeader.addEventListener('click', () => {
            roomBlock.classList.toggle('collapsed');
        });

        dashboardGrid.appendChild(roomBlock);
    }
}

// =================== UI HELPERS ===================
function resetUI() {
    loadingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileNameDisplay.textContent = '';
    fileInput.value = '';
}

function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        padding: '0.65rem 1.2rem',
        borderRadius: '8px',
        fontSize: '0.82rem',
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
        zIndex: '9999',
        opacity: '0',
        transition: 'all 0.3s ease',
        background: type === 'error' ? '#fef2f2' : '#f0fdf4',
        color: type === 'error' ? '#dc2626' : '#16a34a',
        border: type === 'error' ? '1px solid #fecaca' : '1px solid #bbf7d0',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
    });

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =================== SMOOTH SCROLL FOR ANCHOR LINKS ===================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
