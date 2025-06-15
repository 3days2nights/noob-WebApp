// script.js

// Google Apps Script URL for data submission and retrieval
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMw6e0QD1vXQpqWX5CC83jJ-Y8Oww7oLH1mKpmzhZLRCAcwhOgmIs0Hl_Xv-KI16LhgQ/exec';

// Initialize Tone.js for sounds
const approvalSynth = new Tone.Synth().toDestination();
const denialSynth = new Tone.MembraneSynth().toDestination();
const clickSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" }
}).toDestination();

// New synths for more specific sounds
const saveSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { release: 0.2 }
}).toDestination();
const deleteSynth = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
}).toDestination();
const editSynth = new Tone.DuoSynth({
    vibratoAmount: 0.1,
    vibratoRate: 5,
    harmonicity: 1.5,
    voice0: {
        volume: -10,
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
    },
    voice1: {
        volume: -10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
    }
}).toDestination();
const newRequestSynth = new Tone.PolySynth(Tone.Synth, { 
    oscillator: { type: "triangle" },
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 }
}).toDestination();
const loginSynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "square" },
    envelope: { attack: 0.02, release: 0.3 }
}).toDestination();
const logoutSynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.5 }
}).toDestination();


// Sound functions
const playClickSound = () => {
    clickSynth.triggerAttackRelease("C5", "16n"); // Higher pitch, shorter click
};
const playApprovalSound = () => {
    approvalSynth.triggerAttackRelease("C5", "8n");
    approvalSynth.triggerAttackRelease("E5", "8n", "+0.1");
    approvalSynth.triggerAttackRelease("G5", "8n", "+0.2");
    approvalSynth.triggerAttackRelease("C6", "4n", "+0.3"); // Add a higher note for more cheer
};
const playDenialSound = () => {
    denialSynth.triggerAttackRelease("C2", "8n");
    denialSynth.triggerAttackRelease("C1", "8n", "+0.1");
    denialSynth.triggerAttackRelease("F#1", "8n", "+0.2"); // More dissonant for denial
};
const playSaveSound = () => {
    saveSynth.triggerAttackRelease(["C5", "E5", "G5"], "8n"); // Happy ascending chord
};
const playDeleteSound = () => {
    deleteSynth.triggerAttackRelease("8n"); // Short noise burst
};
const playEditSound = () => {
    editSynth.triggerAttackRelease("D4", "8n"); // Gentle chime
};
const playNewRequestSound = () => {
    newRequestSynth.triggerAttackRelease(["C5", "G5"], "4n"); // Optimistic two-note melody (works with PolySynth)
};
const playLoginSound = () => {
    loginSynth.triggerAttackRelease(["C4", "E4", "G4"], "4n"); // Welcoming chord
};
const playLogoutSound = () => {
    logoutSynth.triggerAttackRelease("G4", "0.5"); // Gentle fade out
};


// DOM Elements
const loginPage = document.getElementById('loginPage');
const loginParentBtn = document.getElementById('loginParentBtn');
const loginKidBtn = document.getElementById('loginKidBtn');
const passwordInput = document.getElementById('passwordInput'); // Single password input
const loginError = document.getElementById('loginError');

const kidDashboard = document.getElementById('kidDashboard');
const kidNameDisplay = document.getElementById('kidNameDisplay');
const totalRequestsKid = document.getElementById('totalRequestsKid');
const approvedRequestsKid = document.getElementById('approvedRequestsKid');
const pendingRequestsKid = document.getElementById('pendingRequestsKid');
const deniedRequestsKid = document.getElementById('deniedRequestsKid');
const kidRequestsTableBody = document.getElementById('kidRequestsTableBody');
const newRequestBtn = document.getElementById('newRequestBtn');
const logoutKidBtn = document.getElementById('logoutKidBtn');

const parentDashboard = document.getElementById('parentDashboard');
const totalRequestsParent = document.getElementById('totalRequestsParent');
const approvedRequestsParent = document.getElementById('approvedRequestsParent');
const pendingRequestsParent = document.getElementById('pendingRequestsParent');
const deniedRequestsParent = document.getElementById('deniedRequestsParent');
const parentRequestsTableBody = document.getElementById('parentRequestsTableBody');
const logoutParentBtn = document.getElementById('logoutParentBtn');

const requestFormPage = document.getElementById('requestForm');
const permissionForm = document.getElementById('permissionForm');
const requestId = document.getElementById('requestId');
const requesterNameInput = document.getElementById('requesterName');
const requestDateInput = document.getElementById('requestDate');
const timeFromInput = document.getElementById('timeFrom');
const timeToInput = document.getElementById('timeTo');
const requestLocationInput = document.getElementById('requestLocation');
const requestReasonInput = document.getElementById('requestReason');
const backToDashboardBtn = document.getElementById('backToDashboardBtn');

const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

// Global variables
let currentUser = null; // { type: 'parent' | 'kid', name: 'พ่อ-แม่' | 'หนมปัง-เนยสด' }
let requests = [];

// --- Data Management (Local Storage) ---
const LOCAL_STORAGE_KEY = 'parentalPermissionRequestsCuteV3'; // Retain the same key

/**
 * Loads requests from Local Storage.
 * @returns {Array} An array of request objects.
 */
const loadRequests = () => {
    const storedRequests = localStorage.getItem(LOCAL_STORAGE_KEY);
    requests = storedRequests ? JSON.parse(storedRequests) : [];
    // Ensure IDs are unique for new requests after loading
    requests.forEach(req => req.id = req.id || crypto.randomUUID());
};

/**
 * Saves requests to Local Storage.
 */
const saveRequests = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
};

// --- UI Rendering Functions ---

/**
 * Hides all main application sections.
 */
const hideAllSections = () => {
    loginPage.classList.add('hidden');
    kidDashboard.classList.add('hidden');
    parentDashboard.classList.add('hidden');
    requestFormPage.classList.add('hidden');
};

/**
 * Renders the appropriate dashboard based on the current user.
 * This function ensures the correct dashboard is shown and updated.
 * This function is called AFTER data is loaded/updated.
 */
const renderCurrentDashboardAfterDataLoaded = () => {
    if (currentUser === null) {
        hideAllSections();
        loginPage.classList.remove('hidden');
    } else if (currentUser.type === 'kid') {
        renderKidDashboard();
    } else if (currentUser.type === 'parent') {
        renderParentDashboard();
    }
};

/**
 * Displays a custom modal.
 * @param {string} title - The title of the modal.
 * @param {string} message - The message content.
 * @param {boolean} showConfirm - Whether to show the confirm button.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled.
 */
const showCustomModal = (title, message, showConfirm = false) => {
    return new Promise(resolve => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalConfirmBtn.classList.toggle('hidden', !showConfirm);
        modalCancelBtn.textContent = showConfirm ? 'ยกเลิก 😔' : 'เข้าใจแล้ว! 👍'; 
        
        customModal.classList.add('show');

        const handleConfirm = () => {
            playClickSound(); // Generic click for modal actions
            customModal.classList.remove('show');
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            modalCancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            playClickSound(); // Generic click for modal actions
            customModal.classList.remove('show');
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            modalCancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        modalConfirmBtn.addEventListener('click', handleConfirm);
        modalCancelBtn.addEventListener('click', handleCancel);
    });
};

/**
 * Creates a confetti animation for approval.
 */
const createConfetti = () => {
    for (let i = 0; i < 90; i++) { 
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.top = `${Math.random() * -30}vh`; 
        
        // Randomize confetti colors
        const colors = ['var(--color-pastel-pink)', 'var(--color-light-peach)', 'var(--color-pale-lavender)', 'var(--color-mint-green)', 'var(--color-cream)', 'var(--color-accent-yellow)', 'var(--color-accent-green)'];
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Randomize shape (circle or square)
        if (Math.random() < 0.4) { 
            confetti.style.borderRadius = '0';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        }

        confetti.style.animationDelay = `${Math.random() * 0.9}s`; 
        confetti.style.animationDuration = `${4 + Math.random() * 3}s`; 
        document.body.appendChild(confetti);
        confetti.addEventListener('animationend', () => confetti.remove());
    }
};

/**
 * Creates an "explode" animation for denial.
 * @param {Event} event - The click event to get coordinates.
 */
const createDenyAnimation = (event) => {
    const denyEffect = document.createElement('div');
    denyEffect.classList.add('deny-animation');
    denyEffect.style.left = `${event.clientX - 45}px`; 
    denyEffect.style.top = `${event.clientY - 45}px`; 
    document.body.appendChild(denyEffect);
    denyEffect.addEventListener('animationend', () => denyEffect.remove());
};

/**
 * Helper function to format date to "D Month_abbr BE_year" (e.g., "6 มิ.ย. 2568")
 * @param {string} dateString - The date string in `YYYY-MM-DD` format.
 * @returns {string} Formatted date string.
 */
const formatThaiDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
    }

    const day = date.getDate();
    const monthNamesThai = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const month = monthNamesThai[date.getMonth()];
    const thaiYear = date.getFullYear() + 543; // Buddhist Era

    return `${day} ${month} ${thaiYear}`;
};

/**
 * Helper function to format time value to "HH:MM" string, handling different input formats.
 * This ensures time is displayed consistently regardless of how GAS sends it.
 * @param {string|Date} timeValue - The time value (e.g., "10:00", "2025-06-15T10:00:00.000Z", or Date object).
 * @returns {string} Formatted time string "HH:MM".
 */
const formatTimeForDisplay = (timeValue) => {
    if (typeof timeValue === 'string') {
        // If it's already an "HH:MM" string, use it directly
        if (timeValue.match(/^\d{2}:\d{2}$/)) {
            return timeValue;
        }
        // If it's an ISO string or other date string, try to parse and format local time
        const date = new Date(timeValue);
        // Check if date is valid. If it's a valid date, format it. Otherwise, return original string.
        if (!isNaN(date.getTime())) {
            const hours = date.getHours().toString().padStart(2, '0'); // Use getHours for local time
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    } else if (timeValue instanceof Date) {
        // If it's a Date object, format its local time
        const hours = timeValue.getHours().toString().padStart(2, '0');
        const minutes = timeValue.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    // Fallback for unexpected formats
    return String(timeValue || ''); 
};

/**
 * Renders the kid's dashboard with updated request data.
 */
const renderKidDashboard = () => {
    if (currentUser.type !== 'kid') return;

    hideAllSections();
    kidDashboard.classList.remove('hidden');
    kidNameDisplay.textContent = currentUser.name; 

    // Filter requests for both 'หนมปัง' and 'เนยสด'
    const filteredRequests = requests.filter(req => ['หนมปัง', 'เนยสด'].includes(req.requester));

    const total = filteredRequests.length;
    const approved = filteredRequests.filter(req => req.status === 'อนุมัติ').length;
    const pending = filteredRequests.filter(req => req.status === 'รออนุมัติ').length;
    const denied = filteredRequests.filter(req => req.status === 'ไม่อนุมัติ').length;

    totalRequestsKid.textContent = total;
    approvedRequestsKid.textContent = approved;
    pendingRequestsKid.textContent = pending;
    deniedRequestsKid.textContent = denied;

    kidRequestsTableBody.innerHTML = '';
    if (filteredRequests.length === 0) {
        kidRequestsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-dark-purple-text bg-cream rounded-xl shadow-sm">
            <i class="fas fa-box-open mr-2 text-2xl text-pastel-pink"></i> ยังไม่มีคำขอ... มาสร้างคำขอแรกกันเลยนะ! 🥳
        </td></tr>`;
    } else {
        // Sort requests: pending first, then by date (newest first)
        filteredRequests.sort((a, b) => {
            if (a.status === 'รออนุมัติ' && b.status !== 'รออนุมัติ') return -1;
            if (a.status !== 'รออนุมัติ' && b.status === 'รออนุมัติ') return 1;
            // Fallback to alphabetical if dates are same or invalid
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (isNaN(dateA) || isNaN(dateB)) {
                return 0; 
            }
            return dateB - dateA;
        });

        filteredRequests.forEach(request => {
            // Defensive check for request object validity
            if (typeof request !== 'object' || request === null) {
                console.warn('Skipping invalid request entry:', request);
                return; 
            }

            const tableRow = document.createElement('tr'); 
            if (!tableRow) { 
                console.error('Failed to create <tr> element (tableRow is null/undefined) for request:', request);
                return; 
            }

            // Safe access for properties using || ''
            const requester = request.requester || '';
            const location = request.location || '';
            const reason = request.reason || '';
            const statusValue = request.status || '';

            // Use the new formatThaiDate function for displayDate
            const displayDate = formatThaiDate(request.date);
            const displayTimeFrom = formatTimeForDisplay(request.timeFrom);
            const displayTimeTo = formatTimeForDisplay(request.timeTo);


            const statusText = {
                'รออนุมัติ': '⏳ รออนุมัติ',
                'อนุมัติ': '✅ อนุมัติ',
                'ไม่อนุมัติ': '❌ ไม่อนุมัติ' 
            }[statusValue] || statusValue; 
            
            const statusClass = {
                'รออนุมัติ': 'status-pending',
                'อนุมัติ': 'status-approved',
                'ไม่อนุมัติ': 'status-denied' 
            }[statusValue] || ''; 

            const buttonsDisabled = (statusValue !== 'รออนุมัติ') ? 'disabled' : '';

            tableRow.innerHTML = `
                <td data-label="ผู้ขอ">${requester}</td>
                <td data-label="วันที่">${displayDate}</td>
                <td data-label="เวลา">${displayTimeFrom} - ${displayTimeTo}</td>
                <td data-label="สถานที่">${location}</td>
                <td data-label="เหตุผล">${reason}</td>
                <td data-label="สถานะ"><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td data-label="การจัดการ" class="flex flex-wrap gap-2 justify-center">
                    <button class="cute-btn cute-btn-warning cute-btn-sm" onclick="editRequest('${request.id || ''}')" ${buttonsDisabled}>
                        <i class="fas fa-edit"></i> <span class="hidden md:inline">แก้ไข</span>
                    </button>
                    <button class="cute-btn cute-btn-danger cute-btn-sm" onclick="confirmDeleteRequest('${request.id || ''}')">
                        <i class="fas fa-trash-alt"></i> <span class="hidden md:inline">ลบ</span>
                    </button>
                </td>
            `;
            kidRequestsTableBody.appendChild(tableRow); 
        });
    }
};

/**
 * Renders the parent's dashboard with updated request data.
 */
const renderParentDashboard = () => {
    if (currentUser.type !== 'parent') return;

    hideAllSections();
    parentDashboard.classList.remove('hidden');

    const total = requests.length;
    const approved = requests.filter(req => req.status === 'อนุมัติ').length;
    const pending = requests.filter(req => req.status === 'รออนุมัติ').length;
    const denied = requests.filter(req => req.status === 'ไม่อนุมัติ').length; 

    totalRequestsParent.textContent = total;
    approvedRequestsParent.textContent = approved;
    pendingRequestsParent.textContent = pending;
    deniedRequestsParent.textContent = denied;

    parentRequestsTableBody.innerHTML = '';
    if (requests.length === 0) {
        parentRequestsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-dark-purple-text bg-cream rounded-xl shadow-sm">
            <i class="fas fa-box-open mr-2 text-2xl text-pastel-pink"></i> ยังไม่มีคำขอเข้ามาเลย... สบายจังเลยนะเรา! 😴
        </td></tr>`;
    } else {
        // Sort requests: pending first, then by date (newest first)
        requests.sort((a, b) => {
            if (a.status === 'รออนุมัติ' && b.status !== 'รออนุมัติ') return -1;
            if (a.status !== 'รออนุมัติ' && b.status === 'รออนุมัติ') return 1;
             // Fallback to alphabetical if dates are same or invalid
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (isNaN(dateA) || isNaN(dateB)) {
                return 0; 
            }
            return dateB - dateA;
        });

        requests.forEach(request => {
            // Defensive check for request object validity
            if (typeof request !== 'object' || request === null) {
                console.warn('Skipping invalid request entry:', request);
                return;
            }

            const tableRow = document.createElement('tr'); 
            if (!tableRow) { 
                console.error('Failed to create <tr> element (tableRow is null/undefined) for request:', request);
                return;
            }

            // Safe access for properties using || ''
            const requester = request.requester || '';
            const location = request.location || '';
            const reason = request.reason || '';
            const statusValue = request.status || '';

            // Use the new formatThaiDate function for displayDate
            const displayDate = formatThaiDate(request.date);
            const displayTimeFrom = formatTimeForDisplay(request.timeFrom);
            const displayTimeTo = formatTimeForDisplay(request.timeTo);

            const statusText = {
                'รออนุมัติ': '⏳ รออนุมัติ',
                'อนุมัติ': '✅ อนุมัติ',
                'ไม่อนุมัติ': '❌ ไม่อนุมัติ' 
            }[statusValue] || statusValue;
            
            const statusClass = {
                'รออนุมัติ': 'status-pending',
                'อนุมัติ': 'status-approved',
                'ไม่อนุมัติ': 'status-denied' 
            }[statusValue] || '';

            const buttonsDisabled = (statusValue !== 'รออนุมัติ') ? 'disabled' : '';

            tableRow.innerHTML = `
                <td data-label="ผู้ขอ">${requester}</td>
                <td data-label="วันที่">${displayDate}</td>
                <td data-label="เวลา">${displayTimeFrom} - ${displayTimeTo}</td>
                <td data-label="สถานที่">${location}</td>
                <td data-label="เหตุผล">${reason}</td>
                <td data-label="สถานะ"><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td data-label="การจัดการ" class="flex flex-wrap gap-2 justify-center">
                            ${statusValue === 'รออนุมัติ' ? `
                                <button class="cute-btn cute-btn-success cute-btn-sm" onclick="approveRequest('${request.id || ''}', event)">
                                    <i class="fas fa-check"></i> <span class="hidden md:inline">อนุมัติ</span>
                                </button>
                                <button class="cute-btn cute-btn-danger cute-btn-sm" onclick="denyRequest('${request.id || ''}', event)">
                                    <i class="fas fa-times"></i> <span class="hidden md:inline">ไม่อนุมัติ</span>
                                </button>
                            ` : ''}
                    <button class="cute-btn cute-btn-secondary cute-btn-sm" onclick="confirmDeleteRequest('${request.id || ''}')">
                        <i class="fas fa-trash-alt"></i> <span class="hidden md:inline">ลบ</span>
                    </button>
                </td>
            `;
            parentRequestsTableBody.appendChild(tableRow);
        });
    }
};

/**
 * Shows the request form for creating a new request.
 */
const showNewRequestForm = () => {
    playNewRequestSound(); // Play new request sound
    hideAllSections();
    requestFormPage.classList.remove('hidden');
    // Clear form for new request
    permissionForm.reset();
    requestId.value = '';
    // Pre-fill with 'หนมปัง' as default, user can change to 'เนยสด'
    requesterNameInput.value = 'หนมปัง'; 
    
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    requestDateInput.value = `${year}-${month}-${day}`;
};

/**
 * Populates the form with existing request data for editing.
 * @param {string} id - The ID of the request to edit.
 */
const editRequest = (id) => {
    playEditSound(); // Play edit sound
    const requestToEdit = requests.find(req => req.id === id);
    if (!requestToEdit) {
        showCustomModal('ไม่พบคำขอ', 'ไม่พบคำขอที่คุณต้องการแก้ไข 🤷‍♀️');
        return;
    }

    hideAllSections();
    requestFormPage.classList.remove('hidden');

    // Populate form fields, ensuring date/time from ISO format is correctly set for input fields
    requestId.value = requestToEdit.id;
    requesterNameInput.value = requestToEdit.requester;
    
    // For date input
    if (requestToEdit.date instanceof Date) {
        requestDateInput.value = requestToEdit.date.toISOString().split('T')[0];
    } else if (typeof requestToEdit.date === 'string' && requestToEdit.date.includes('T')) {
        requestDateInput.value = requestToEdit.date.split('T')[0];
    } else if (typeof requestToEdit.date === 'string' && requestToEdit.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        requestDateInput.value = requestToEdit.date;
    } else {
        requestDateInput.value = '';
    }
    
    // Use formatTimeForDisplay to ensure consistent output for input field
    timeFromInput.value = formatTimeForDisplay(requestToEdit.timeFrom);
    timeToInput.value = formatTimeForDisplay(requestToEdit.timeTo);

    requestLocationInput.value = requestToEdit.location || '';
    requestReasonInput.value = requestToEdit.reason || '';
};

/**
 * Handles the submission of the permission form (create or edit).
 * @param {Event} event - The form submission event.
 */
const submitRequest = async (event) => {
    event.preventDefault();

    const id = requestId.value;
    const requester = requesterNameInput.value;
    const date = requestDateInput.value;
    const timeFrom = timeFromInput.value; // These should already be HH:MM from input type="time"
    const timeTo = timeToInput.value;     // These should already be HH:MM from input type="time"
    const location = requestLocationInput.value.trim();
    const reason = requestReasonInput.value.trim();

    if (!requester || !date || !timeFrom || !timeTo || !location || !reason) {
        await showCustomModal('ข้อมูลไม่ครบ!', 'โปรดกรอกข้อมูลให้ครบถ้วนทุกช่องนะจ๊ะ 📝 ขาดไม่ได้เลย! 🥹');
        return;
    }
    // Date validation: Check if requestDate is in the past
    // New Date() from `YYYY-MM-DD` string is usually local date at midnight, so compare with today at midnight.
    const today = new Date();
    today.setHours(0,0,0,0); 
    const selectedDate = new Date(date);
    selectedDate.setHours(0,0,0,0); 

    if (selectedDate < today) {
        await showCustomModal('วันที่จะออกไปผิดพลาด!', 'จะออกไปในอดีตไม่ได้นะจ๊ะหนู 🙄 เวลาย้อนกลับไม่ได้นะ! ⏱️');
        return;
    }
    if (timeFrom >= timeTo) {
        await showCustomModal('เวลาไป-กลับผิดพลาด!', 'เวลาไปต้องมาก่อนเวลากลับสิลูก! 🤦‍♀️ ตกลงจะกลับตอนไหนกันแน่! 😵‍💫');
        return;
    }

    if (id) {
        // Editing existing request
        const requestIndex = requests.findIndex(req => req.id === id);
        if (requestIndex !== -1) {
            requests[requestIndex] = {
                ...requests[requestIndex], 
                requester,
                date, 
                timeFrom, // Save as HH:MM directly from input
                timeTo,   // Save as HH:MM directly from input
                location,
                reason,
                status: 'รออนุมัติ' 
            };
            playSaveSound(); 
            await showCustomModal('แก้ไขคำขอสำเร็จ! ✨', 'คำขอของคุณได้รับการแก้ไขแล้วจ้า! รอพ่อแม่พิจารณาอีกครั้งนะ 👨‍👩‍👧‍👦', false);
        }
    } else {
        // Creating new request
        const newRequest = {
            id: crypto.randomUUID(),
            requester,
            date, 
            timeFrom, // Save as HH:MM directly from input
            timeTo,   // Save as HH:MM directly from input
            location,
            reason,
            status: 'รออนุมัติ' 
        };
        requests.push(newRequest);
        playSaveSound(); 
        await showCustomModal('ส่งคำขอสำเร็จ! 💌', 'คำขอของคุณถูกส่งแล้ว! รอพ่อแม่ใจดีอนุมัตินะจ๊ะ 😌 อย่าลุ้นเยอะนะ! 🤪', false);
    }

    saveRequests();
    renderCurrentDashboardAfterDataLoaded(); 
    sendDataToGoogleSheet(requests); 
};

/**
 * Confirms and deletes a request.
 * @param {string} id - The ID of the request to delete.
 */
const confirmDeleteRequest = async (id) => {
    playClickSound(); 
    const confirmed = await showCustomModal(
        'ยืนยันการลบ 🗑️',
        'แน่ใจนะว่าจะลบคำขอนี้? ลบแล้วกู้คืนไม่ได้นะ! เสียใจแย่เลย! 🥺',
        true 
    );

    if (confirmed) {
        deleteRequest(id);
    }
};

/**
 * Deletes a request from the array and updates UI.
 * @param {string} id - The ID of the request to delete.
 */
const deleteRequest = async (id) => {
    playDeleteSound(); 
    requests = requests.filter(req => req.id !== id);
    saveRequests();
    await showCustomModal('ลบคำขอสำเร็จ! 💨', 'คำขอหายไปแล้วจ้า! โล่งไหม? 👻 หรือแอบเสียดาย? 😅');
    renderCurrentDashboardAfterDataLoaded(); 
    sendDataToGoogleSheet(requests); 
};

/**
 * Approves a request and updates UI.
 * @param {string} id - The ID of the request to approve.
 * @param {Event} event - The click event for animation.
 */
const approveRequest = async (id, event) => {
    const requestIndex = requests.findIndex(req => req.id === id);
    if (requestIndex !== -1) {
        requests[requestIndex].status = 'อนุมัติ';
        saveRequests();
        playApprovalSound();
        createConfetti(); 
        await showCustomModal('อนุมัติแล้วจ้า! 🎉✨', 'พ่อแม่ใจดีอนุมัติให้แล้วนะ! ออกไปเที่ยวให้สนุก แต่ห้ามดื้อนะจ๊ะ! 👑💖', false);
        renderCurrentDashboardAfterDataLoaded(); 
        sendDataToGoogleSheet(requests); 
    }
};

/**
 * Denies a request and updates UI.
 * @param {string} id - The ID of the request to deny.
 * @param {Event} event - The click event for animation.
 */
const denyRequest = async (id, event) => {
    const requestIndex = requests.findIndex(req => req.id === id);
    if (requestIndex !== -1) {
        requests[requestIndex].status = 'ไม่อนุมัติ'; 
        saveRequests();
        playDenialSound();
        createDenyAnimation(event); 
        await showCustomModal('ไม่อนุมัติ 😭💔', 'เสียใจด้วยนะจ๊ะ พ่อแม่บอกว่า "ยังก่อนนะหนู! 🤷‍♂️" ไว้โอกาสหน้านะลูก! 😔', false);
        renderCurrentDashboardAfterDataLoaded(); 
        sendDataToGoogleSheet(requests); 
    }
};

// --- Google Sheet Integration (JSONP) ---
let jsonpScriptCounter = 0; 

/**
 * Main global callback function for Google Apps Script JSONP WRITE response.
 * This function is called by the temporary, unique callback.
 * @param {Object} response - The response object from Apps Script.
 */
window._mainGoogleSheetWriteResponseHandler = (response) => { 
    Swal.close(); 
    if (response.status === 'success') {
        // Swal.fire for success will be called from submitRequest, not here to allow sound to play first
    } else {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล! 😓',
            text: response.message || 'โปรดลองใหม่อีกครั้ง หรือตรวจสอบ Google Apps Script นะ!',
            showConfirmButton: true,
            confirmButtonText: 'รับทราบ',
            customClass: {
                popup: 'rounded-3xl border-4 border-pastel-pink',
                title: 'text-dark-purple-text font-bold',
                htmlContainer: 'text-dark-purple-text',
                confirmButton: 'cute-btn cute-btn-danger'
            }
        });
    }
    // Remove the script tag that triggered this response
    const scriptEl = document.getElementById(response._scriptId); 
    if (scriptEl) scriptEl.remove();
};

/**
 * Sends data to Google Sheet using JSONP.
 * This is for WRITE operations.
 * @param {Array} dataToSend - The array of request objects to send.
 */
const sendDataToGoogleSheet = (dataToSend) => {
    // Show loading alert immediately
    Swal.fire({
        title: 'กำลังบันทึกข้อมูล...',
        html: '<i class="fas fa-spinner fa-spin text-4xl text-pastel-pink"></i>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        },
        customClass: {
            popup: 'rounded-3xl border-4 border-pastel-pink',
            title: 'text-dark-purple-text font-bold'
        }
    });

    const currentScriptId = 'jsonp-write-script-' + (jsonpScriptCounter++);
    const uniqueCallbackName = 'jsonpWriteCallback_' + currentScriptId.replace(/-/g, '_'); 
    
    // Assign a temporary unique callback function that calls the main handler
    window[uniqueCallbackName] = (response) => {
        window._mainGoogleSheetWriteResponseHandler({ ...response, _scriptId: currentScriptId });
        delete window[uniqueCallbackName]; 
    };

    const encodedData = encodeURIComponent(JSON.stringify(dataToSend));
    // Pass the currentScriptId to Apps Script so it can return it for cleanup
    const url = `${GOOGLE_APP_SCRIPT_URL}?callback=${uniqueCallbackName}&data=${encodedData}&_scriptId=${currentScriptId}`;

    const script = document.createElement('script');
    script.id = currentScriptId; 
    script.src = url;
    script.async = true;
    script.onerror = () => {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาดเครือข่าย! 🌐',
            text: 'ไม่สามารถเชื่อมต่อกับ Google Apps Script ได้ โปรดตรวจสอบอินเทอร์เน็ตหรือ URL',
            showConfirmButton: true,
            confirmButtonText: 'ตกลง',
            customClass: {
                popup: 'rounded-3xl border-4 border-pastel-pink',
                title: 'text-dark-purple-text font-bold',
                htmlContainer: 'text-dark-purple-text',
                confirmButton: 'cute-btn cute-btn-danger'
            }
        });
        const errorScriptEl = document.getElementById(currentScriptId);
        if (errorScriptEl) errorScriptEl.remove();
        delete window[uniqueCallbackName]; 
    };
    document.head.appendChild(script);

    setTimeout(() => {
        if (document.getElementById(currentScriptId)) { 
            Swal.close();
            Swal.fire({
                icon: 'warning',
                title: 'การบันทึกใช้เวลานาน! ⏳',
                text: 'Google Apps Script อาจใช้เวลาตอบสนองนาน หรือเกิดข้อผิดพลาดภายใน',
                showConfirmButton: true,
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: 'rounded-3xl border-4 border-pastel-pink',
                    title: 'text-dark-purple-text font-bold',
                    htmlContainer: 'text-dark-purple-text',
                    confirmButton: 'cute-btn cute-btn-warning'
                }
            });
            const timeoutScriptEl = document.getElementById(currentScriptId);
            if (timeoutScriptEl) timeoutScriptEl.remove();
            delete window[uniqueCallbackName]; 
        }
    }, 10000); 
};

/**
 * Main global callback function for Google Apps Script JSONP READ response.
 * This function is called by the temporary, unique callback.
 * @param {Object} response - The response object from Apps Script.
 */
window._mainGoogleSheetReadResponseHandler = (response) => { 
    Swal.close(); 

    if (response.status === 'success' && Array.isArray(response.data)) {
        requests = response.data; 
        saveRequests(); 
        Swal.fire({
            icon: 'success',
            title: 'โหลดข้อมูลสำเร็จ! ✨',
            text: 'รายการคำขออัปเดตล่าสุดแล้วจ้า!',
            showConfirmButton: false,
            timer: 1500,
            customClass: {
                popup: 'rounded-3xl border-4 border-pastel-pink',
                title: 'text-dark-purple-text font-bold',
                htmlContainer: 'text-dark-purple-text'
            }
        });
        renderCurrentDashboardAfterDataLoaded(); 
    } else {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล! 😓',
            text: response.message || 'ไม่สามารถดึงข้อมูลล่าสุดจาก Google Sheet ได้ โปรดลองใหม่อีกครั้ง หรือตรวจสอบ Apps Script นะ!',
            showConfirmButton: true,
            confirmButtonText: 'รับทราบ',
            customClass: {
                popup: 'rounded-3xl border-4 border-pastel-pink',
                title: 'text-dark-purple-text font-bold',
                htmlContainer: 'text-dark-purple-text',
                confirmButton: 'cute-btn cute-btn-danger'
            }
        });
        // If fetch fails, fall back to local storage data.
        loadRequests(); 
        renderCurrentDashboardAfterDataLoaded(); 
    }
    // Remove the script tag that triggered this response
    const scriptEl = document.getElementById(response._scriptId); 
    if (scriptEl) scriptEl.remove();
};


/**
 * Fetches data from Google Sheet using JSONP.
 * This is for READ operations.
 */
const fetchDataFromGoogleSheet = () => {
    // Show loading alert immediately
    Swal.fire({
        title: 'กำลังโหลดข้อมูล...',
        html: '<i class="fas fa-spinner fa-spin text-4xl text-pastel-pink"></i>',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        },
        customClass: {
            popup: 'rounded-3xl border-4 border-pastel-pink',
            title: 'text-dark-purple-text font-bold'
        }
    });

    const currentScriptId = 'jsonp-read-script-' + (jsonpScriptCounter++);
    const uniqueCallbackName = 'jsonpReadCallback_' + currentScriptId.replace(/-/g, '_'); 
    
    // Assign a temporary unique callback function that calls the main handler
    window[uniqueCallbackName] = (response) => {
        window._mainGoogleSheetReadResponseHandler({ ...response, _scriptId: currentScriptId });
        delete window[uniqueCallbackName]; 
    };

    // Pass the currentScriptId to Apps Script so it can return it for cleanup
    const url = `${GOOGLE_APP_SCRIPT_URL}?callback=${uniqueCallbackName}&read=true&_scriptId=${currentScriptId}`;

    const script = document.createElement('script');
    script.id = currentScriptId; 
    script.src = url;
    script.async = true;
    script.onerror = () => {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาดเครือข่าย! 🌐',
            text: 'ไม่สามารถเชื่อมต่อกับ Google Apps Script เพื่อโหลดข้อมูลได้ โปรดตรวจสอบอินเทอร์เน็ตหรือ URL',
            showConfirmButton: true,
            confirmButtonText: 'ตกลง',
            customClass: {
                popup: 'rounded-3xl border-4 border-pastel-pink',
                title: 'text-dark-purple-text font-bold',
                htmlContainer: 'text-dark-purple-text',
                confirmButton: 'cute-btn cute-btn-danger'
            }
        });
        const errorScriptEl = document.getElementById(currentScriptId);
        if (errorScriptEl) errorScriptEl.remove();
        delete window[uniqueCallbackName]; 
        loadRequests(); 
        renderCurrentDashboardAfterDataLoaded(); 
    };
    document.head.appendChild(script);

    setTimeout(() => {
        if (document.getElementById(currentScriptId)) { 
            Swal.close();
            Swal.fire({
                icon: 'warning',
                title: 'การโหลดข้อมูลใช้เวลานาน! ⏳',
                text: 'Google Apps Script อาจใช้เวลาตอบสนองนาน หรือเกิดข้อผิดพลาดภายใน',
                showConfirmButton: true,
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: 'rounded-3xl border-4 border-pastel-pink',
                    title: 'text-dark-purple-text font-bold',
                    htmlContainer: 'text-dark-purple-text',
                    confirmButton: 'cute-btn cute-btn-warning'
                }
            });
            const timeoutScriptEl = document.getElementById(currentScriptId);
            if (timeoutScriptEl) timeoutScriptEl.remove();
            delete window[uniqueCallbackName]; 
            loadRequests(); 
            renderCurrentDashboardAfterDataLoaded(); 
        }
    }, 15000); 
};

// --- Event Listeners ---
loginParentBtn.addEventListener('click', () => {
    if (passwordInput.value === '111') {
        currentUser = { type: 'parent', name: 'พ่อ-แม่' };
        passwordInput.value = '';
        loginError.classList.add('hidden');
        playLoginSound(); 
        fetchDataFromGoogleSheet(); 
    } else {
        playClickSound(); 
        loginError.classList.remove('hidden');
    }
});

loginKidBtn.addEventListener('click', () => {
    if (passwordInput.value === '222') {
        currentUser = { type: 'kid', name: 'หนมปัง-เนยสด' }; 
        passwordInput.value = '';
        loginError.classList.add('hidden');
        playLoginSound(); 
        fetchDataFromGoogleSheet(); 
    } else {
        playClickSound(); 
        loginError.classList.remove('hidden');
    }
});

newRequestBtn.addEventListener('click', showNewRequestForm);
permissionForm.addEventListener('submit', submitRequest);
backToDashboardBtn.addEventListener('click', () => {
    playClickSound(); 
    renderCurrentDashboardAfterDataLoaded(); 
});

logoutKidBtn.addEventListener('click', async () => {
    playLogoutSound(); 
    currentUser = null;
    await showCustomModal('ออกจากระบบ 👋', 'บ๊ายบาย! ไว้มาใหม่นะหนมปัง-เนยสด! 👋💕', false);
    renderCurrentDashboardAfterDataLoaded(); 
});

logoutParentBtn.addEventListener('click', async () => {
    playLogoutSound(); 
    currentUser = null;
    await showCustomModal('ออกจากระบบ 😴', 'ไปพักผ่อนได้แล้ว! พ่อแม่สุดเจ๋ง! 💖', false);
    renderCurrentDashboardAfterDataLoaded(); 
});

// Initial load: แสดงหน้า Login ก่อน, การดึงข้อมูลจาก Google Sheet จะเกิดขึ้นเมื่อ Login สำเร็จ
document.addEventListener('DOMContentLoaded', () => {
    renderCurrentDashboardAfterDataLoaded(); 
});
