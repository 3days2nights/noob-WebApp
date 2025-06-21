const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMw6e0QD1vXQpqWX5CC83jJ-Y8Oww7oLH1mKpmzhZLRCAcwhOgmIs0Hl_Xv-KI16LhgQ/exec';
const approvalSynth = new Tone.Synth().toDestination();
const denialSynth = new Tone.MembraneSynth().toDestination();
const clickSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" } }).toDestination();
const saveSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { release: 0.2 } }).toDestination();
const deleteSynth = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
const editSynth = new Tone.DuoSynth({ vibratoAmount: 0.1, vibratoRate: 5, harmonicity: 1.5, voice0: { volume: -10, oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 } }, voice1: { volume: -10, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 } } }).toDestination();
const logoutSynth = new Tone.MetalSynth({ frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.05 }, harmonicity: 3.5, modulationIndex: 10, resonance: 4000, octave: 1.5 }).toDestination();
const loginSynth = new Tone.FMSynth({ envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 }, harmonicity: 2, modulationIndex: 10, carrier: { oscillator: { type: 'sine' } }, modulator: { oscillator: { type: 'square' } } }).toDestination();
let currentUser = null;
let requests = [];
let originalRequests = [];
const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const newRequestFormPage = document.getElementById('newRequestFormPage');
const loginKidBtn = document.getElementById('loginKidBtn');
const loginParentBtn = document.getElementById('loginParentBtn');
const newRequestBtn = document.getElementById('newRequestBtn');
const permissionForm = document.getElementById('permissionForm');
const backToDashboardBtn = document.getElementById('backToDashboardBtn');
const dashboardTitle = document.getElementById('dashboardTitle');
const dashboardSubtitle = document.getElementById('dashboardSubtitle');
const dashboardContent = document.getElementById('dashboardContent');
const logoutKidBtn = document.getElementById('logoutKidBtn');
const logoutParentBtn = document.getElementById('logoutParentBtn');
const kidDashboardActions = document.getElementById('kidDashboardActions');
const parentDashboardActions = document.getElementById('parentDashboardActions');
const customModal = document.getElementById('customModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');
const modalCancelBtn = document.getElementById('modalCancelBtn');

function playApprovalSound() { approvalSynth.triggerAttackRelease("C5", "8n"); }
function playDenialSound() { denialSynth.triggerAttackRelease("C2", "8n"); }
function playClickSound() { clickSynth.triggerAttackRelease("C4", "32n"); }
function playSaveSound() { saveSynth.triggerAttackRelease("E5", "16n"); }
function playDeleteSound() { deleteSynth.triggerAttackRelease("8n"); }
function playEditSound() { editSynth.triggerAttackRelease("G4", "16n"); }
function playLogoutSound() { logoutSynth.triggerAttackRelease("C3", "8n"); }
function playLoginSound() { loginSynth.triggerAttackRelease("C4", "8n"); }

function saveCurrentUser() { localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
function loadCurrentUser() { const storedUser = localStorage.getItem('currentUser'); if (storedUser) { currentUser = JSON.parse(storedUser); } }

async function fetchDataFromGoogleSheet() {
    Swal.fire({ title: 'กำลังโหลดข้อมูล...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const response = await fetch(`${GOOGLE_APP_SCRIPT_URL}?action=getData`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        requests = data.map(row => ({
            id: row[0],
            kidName: row[1],
            requestDate: row[2],
            requestTime: row[3],
            returnTime: row[4],
            destination: row[5],
            reason: row[6],
            status: row[7],
            parentComment: row[8],
            timestamp: row[9]
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        originalRequests = JSON.parse(JSON.stringify(requests));
        Swal.close();
        renderCurrentDashboard();
    } catch (error) {
        console.error('Error fetching data:', error);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่ภายหลัง', 'error');
    }
}

async function showCustomModal(title, message, showCancel = false) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
    customModal.classList.remove('hidden');
    return new Promise(resolve => {
        const confirmHandler = () => {
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
            customModal.classList.add('hidden');
            resolve(true);
        };
        const cancelHandler = () => {
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
            customModal.classList.add('hidden');
            resolve(false);
        };
        modalConfirmBtn.addEventListener('click', confirmHandler);
        modalCancelBtn.addEventListener('click', cancelHandler);
    });
}

function showPage(pageId) {
    loginPage.classList.add('hidden');
    dashboard.classList.add('hidden');
    newRequestFormPage.classList.add('hidden');
    document.getElementById(pageId).classList.remove('hidden');
}

function renderKidDashboard() {
    dashboardTitle.textContent = `💖 คำขอของ ${currentUser.username} 💖`;
    dashboardSubtitle.textContent = '✨ ตรวจสอบสถานะคำขอที่ส่งไปได้เลย ✨';
    kidDashboardActions.classList.remove('hidden');
    parentDashboardActions.classList.add('hidden');
    let displayRequests = requests.filter(req => req.kidName === currentUser.username);
    if (displayRequests.length === 0) {
        dashboardContent.innerHTML = '<p class="text-xl text-center text-gray-600 mt-8">ยังไม่มีคำขอเลยนะ! ลองสร้างคำขอใหม่สิ!</p>';
        return;
    }
    dashboardContent.innerHTML = `
        <div class="cute-table-container">
            <table class="cute-table">
                <thead>
                    <tr>
                        <th>วันที่</th>
                        <th>ไปที่</th>
                        <th>เหตุผล</th>
                        <th>สถานะ</th>
                        <th>ความคิดเห็นพ่อแม่</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${displayRequests.map(req => `
                        <tr data-request-id="${req.id}" class="${req.status === 'อนุมัติ' ? 'approved' : req.status === 'ไม่อนุมัติ' ? 'denied' : ''}">
                            <td data-label="วันที่">${req.requestDate}</td>
                            <td data-label="ที่ที่ไป">${req.destination}</td>
                            <td data-label="เหตุผล">${req.reason}</td>
                            <td data-label="สถานะ" class="status-cell">${req.status}</td>
                            <td data-label="ความคิดเห็นพ่อแม่" class="parent-comment-cell">${req.parentComment || '-'}</td>
                            <td data-label="จัดการ" class="action-buttons">
                                <button class="cute-btn cute-btn-warning btn-edit ${req.status !== 'รอดำเนินการ' ? 'hidden' : ''}" data-id="${req.id}"><i class="fas fa-edit"></i> แก้ไข</button>
                                <button class="cute-btn cute-btn-danger btn-delete" data-id="${req.id}"><i class="fas fa-trash"></i> ลบ</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.querySelectorAll('.btn-edit').forEach(button => button.addEventListener('click', handleEditRequest));
    document.querySelectorAll('.btn-delete').forEach(button => button.addEventListener('click', handleDeleteRequest));
}

function renderParentDashboard() {
    dashboardTitle.textContent = '💖 คำขอรออนุมัติ (พ่อแม่) 💖';
    dashboardSubtitle.textContent = '✨ จัดการคำขอของลูกๆ ได้เลย ✨';
    kidDashboardActions.classList.add('hidden');
    parentDashboardActions.classList.remove('hidden');
    if (requests.length === 0) {
        dashboardContent.innerHTML = '<p class="text-xl text-center text-gray-600 mt-8">ยังไม่มีคำขอจากลูกๆ เลย</p>';
        return;
    }
    dashboardContent.innerHTML = `
        <div class="cute-table-container">
            <table class="cute-table">
                <thead>
                    <tr>
                        <th>ชื่อลูก</th>
                        <th>วันที่</th>
                        <th>ไปที่</th>
                        <th>เหตุผล</th>
                        <th>สถานะ</th>
                        <th>ความคิดเห็น</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(req => `
                        <tr data-request-id="${req.id}" class="${req.status === 'อนุมัติ' ? 'approved' : req.status === 'ไม่อนุมัติ' ? 'denied' : ''}">
                            <td data-label="ชื่อลูก">${req.kidName}</td>
                            <td data-label="วันที่">${req.requestDate}</td>
                            <td data-label="ที่ที่ไป">${req.destination}</td>
                            <td data-label="เหตุผล">${req.reason}</td>
                            <td data-label="สถานะ" class="status-cell">
                                <select class="status-select" data-id="${req.id}">
                                    <option value="รอดำเนินการ" ${req.status === 'รอดำเนินการ' ? 'selected' : ''}>รอดำเนินการ</option>
                                    <option value="อนุมัติ" ${req.status === 'อนุมัติ' ? 'selected' : ''}>อนุมัติ</option>
                                    <option value="ไม่อนุมัติ" ${req.status === 'ไม่อนุมัติ' ? 'selected' : ''}>ไม่อนุมัติ</option>
                                </select>
                            </td>
                            <td data-label="ความคิดเห็น" class="parent-comment-cell">
                                <textarea class="parent-comment-input" data-id="${req.id}" placeholder="เพิ่มความคิดเห็น...">${req.parentComment || ''}</textarea>
                            </td>
                            <td data-label="จัดการ" class="action-buttons">
                                <button class="cute-btn cute-btn-success btn-save ${isRequestChanged(req) ? '' : 'hidden'}" data-id="${req.id}"><i class="fas fa-save"></i> บันทึก</button>
                                <button class="cute-btn cute-btn-danger btn-delete" data-id="${req.id}"><i class="fas fa-trash"></i> ลบ</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => handleParentInputChange(e, 'status'));
    });
    document.querySelectorAll('.parent-comment-input').forEach(textarea => {
        textarea.addEventListener('input', (e) => handleParentInputChange(e, 'comment'));
    });
    document.querySelectorAll('.btn-save').forEach(button => button.addEventListener('click', handleSaveParentChanges));
    document.querySelectorAll('.btn-delete').forEach(button => button.addEventListener('click', handleDeleteRequest));
}

function isRequestChanged(currentReq) {
    const originalReq = originalRequests.find(req => req.id === currentReq.id);
    if (!originalReq) return true;
    return originalReq.status !== currentReq.status || originalReq.parentComment !== currentReq.parentComment;
}

function handleParentInputChange(event, type) {
    const id = event.target.dataset.id;
    const requestIndex = requests.findIndex(req => req.id === id);
    if (requestIndex > -1) {
        if (type === 'status') {
            requests[requestIndex].status = event.target.value;
        } else if (type === 'comment') {
            requests[requestIndex].parentComment = event.target.value;
        }
        const row = event.target.closest('tr');
        const saveBtn = row.querySelector('.btn-save');
        if (saveBtn) {
            saveBtn.classList.toggle('hidden', !isRequestChanged(requests[requestIndex]));
        }
    }
}

async function handleSaveParentChanges(event) {
    playSaveSound();
    const id = event.target.dataset.id;
    const request = requests.find(req => req.id === id);
    if (!request) {
        await showCustomModal('ข้อผิดพลาด', 'ไม่พบคำขอ', false);
        return;
    }
    const confirmed = await showCustomModal('ยืนยันการบันทึก', `คุณต้องการบันทึกการเปลี่ยนแปลงสำหรับคำขอของ ${request.kidName} ใช่หรือไม่?`, true);
    if (!confirmed) return;
    Swal.fire({ title: 'กำลังบันทึก...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'updateData',
                id: request.id,
                status: request.status,
                parentComment: request.parentComment
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'SUCCESS') {
            await showCustomModal('บันทึกสำเร็จ!', 'การเปลี่ยนแปลงถูกบันทึกเรียบร้อยแล้ว', false);
            await fetchDataFromGoogleSheet();
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึก');
        }
    } catch (error) {
        console.error('Error saving data:', error);
        await showCustomModal('ข้อผิดพลาด', `ไม่สามารถบันทึกการเปลี่ยนแปลงได้: ${error.message}`, false);
    }
}

async function handleEditRequest(event) {
    playEditSound();
    const id = event.target.dataset.id;
    const requestToEdit = requests.find(req => req.id === id);
    if (!requestToEdit) {
        await showCustomModal('ข้อผิดพลาด', 'ไม่พบคำขอที่ต้องการแก้ไข', false);
        return;
    }
    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขคำขอ',
        html: `
            <div class="cute-form text-left">
                <div class="form-group">
                    <label for="swal-kidName" class="form-label">ชื่อของหนู 💖</label>
                    <input id="swal-kidName" class="swal2-input form-input" value="${requestToEdit.kidName}" placeholder="ชื่อของหนู" required>
                </div>
                <div class="form-group">
                    <label for="swal-requestDate" class="form-label">วันที่ที่อยากไป 📅</label>
                    <input type="date" id="swal-requestDate" class="swal2-input form-input" value="${requestToEdit.requestDate}" required>
                </div>
                <div class="form-group">
                    <label for="swal-requestTime" class="form-label">เวลาที่อยากไป ⏰</label>
                    <input type="time" id="swal-requestTime" class="swal2-input form-input" value="${requestToEdit.requestTime}" required>
                </div>
                <div class="form-group">
                    <label for="swal-returnTime" class="form-label">เวลากลับ 🏡</label>
                    <input type="time" id="swal-returnTime" class="swal2-input form-input" value="${requestToEdit.returnTime}" required>
                </div>
                <div class="form-group">
                    <label for="swal-destination" class="form-label">ที่ที่อยากไป 📍</label>
                    <input id="swal-destination" class="swal2-input form-input" value="${requestToEdit.destination}" placeholder="ที่ที่อยากไป" required>
                </div>
                <div class="form-group">
                    <label for="swal-reason" class="form-label">เหตุผลสุดคิ้วท์ 🥺</label>
                    <textarea id="swal-reason" class="swal2-textarea form-input" placeholder="เหตุผลสุดคิ้วท์" required>${requestToEdit.reason}</textarea>
                </div>
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
            const kidName = Swal.getPopup().querySelector('#swal-kidName').value;
            const requestDate = Swal.getPopup().querySelector('#swal-requestDate').value;
            const requestTime = Swal.getPopup().querySelector('#swal-requestTime').value;
            const returnTime = Swal.getPopup().querySelector('#swal-returnTime').value;
            const destination = Swal.getPopup().querySelector('#swal-destination').value;
            const reason = Swal.getPopup().querySelector('#swal-reason').value;
            if (!kidName || !requestDate || !requestTime || !returnTime || !destination || !reason) {
                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                return false;
            }
            return { kidName, requestDate, requestTime, returnTime, destination, reason };
        },
        showCancelButton: true,
        confirmButtonText: 'บันทึกการแก้ไข',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            container: 'swal2-container-custom',
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            htmlContainer: 'swal2-html-container-custom',
            confirmButton: 'cute-btn cute-btn-success swal2-confirm-button-custom',
            cancelButton: 'cute-btn cute-btn-danger swal2-cancel-button-custom'
        },
        buttonsStyling: false
    });

    if (formValues) {
        Swal.fire({ title: 'กำลังบันทึกการแก้ไข...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        try {
            const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'updateRequest',
                    id: requestToEdit.id,
                    kidName: formValues.kidName,
                    requestDate: formValues.requestDate,
                    requestTime: formValues.requestTime,
                    returnTime: formValues.returnTime,
                    destination: formValues.destination,
                    reason: formValues.reason
                })
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'SUCCESS') {
                await showCustomModal('แก้ไขสำเร็จ!', 'คำขอของคุณได้รับการแก้ไขแล้ว', false);
                await fetchDataFromGoogleSheet();
            } else {
                throw new Error(result.message || 'เกิดข้อผิดพลาดในการแก้ไข');
            }
        } catch (error) {
            console.error('Error updating request:', error);
            await showCustomModal('ข้อผิดพลาด', `ไม่สามารถแก้ไขคำขอได้: ${error.message}`, false);
        }
    }
}

async function handleDeleteRequest(event) {
    playDeleteSound();
    const id = event.target.dataset.id;
    const requestToDelete = requests.find(req => req.id === id);
    if (!requestToDelete) {
        await showCustomModal('ข้อผิดพลาด', 'ไม่พบคำขอที่ต้องการลบ', false);
        return;
    }
    const confirmed = await showCustomModal('ยืนยันการลบ', `คุณต้องการลบคำขอของ ${requestToDelete.kidName} สำหรับไปที่ ${requestToDelete.destination} ใช่หรือไม่?`, true);
    if (!confirmed) return;
    Swal.fire({ title: 'กำลังลบ...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'deleteData',
                id: id
            })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'SUCCESS') {
            await showCustomModal('ลบสำเร็จ!', 'คำขอถูกลบเรียบร้อยแล้ว', false);
            await fetchDataFromGoogleSheet();
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการลบ');
        }
    } catch (error) {
        console.error('Error deleting data:', error);
        await showCustomModal('ข้อผิดพลาด', `ไม่สามารถลบคำขอได้: ${error.message}`, false);
    }
}

function renderCurrentDashboard() {
    if (currentUser && currentUser.role === 'kid') {
        renderKidDashboard();
        showPage('dashboard');
    } else if (currentUser && currentUser.role === 'parent') {
        renderParentDashboard();
        showPage('dashboard');
    } else {
        showPage('loginPage');
    }
}

async function renderCurrentDashboardAfterDataLoaded() {
    await fetchDataFromGoogleSheet();
}

function showNewRequestForm() {
    playClickSound();
    permissionForm.reset();
    document.getElementById('kidName').value = currentUser.username;
    document.getElementById('kidName').setAttribute('readonly', 'true');
    showPage('newRequestFormPage');
}

async function submitRequest(event) {
    event.preventDefault();
    playClickSound();
    const formData = new FormData(permissionForm);
    const data = {
        action: 'submitForm',
        kidName: formData.get('kidName'),
        requestDate: formData.get('requestDate'),
        requestTime: formData.get('requestTime'),
        returnTime: formData.get('returnTime'),
        destination: formData.get('destination'),
        reason: formData.get('reason')
    };
    Swal.fire({ title: 'กำลังส่งคำขอ...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.status === 'SUCCESS') {
            await showCustomModal('ส่งคำขอสำเร็จ!', 'รอพ่อแม่ใจดีอนุมัติได้เลย 😉', false);
            permissionForm.reset();
            renderCurrentDashboardAfterDataLoaded();
        } else {
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        await showCustomModal('ข้อผิดพลาด', `ไม่สามารถส่งคำขอได้: ${error.message}`, false);
    }
}

loginKidBtn.addEventListener('click', async () => {
    playLoginSound();
    const { value: username } = await Swal.fire({
        title: 'ชื่อของหนู 💖',
        input: 'text',
        inputLabel: 'หนูชื่ออะไรเอ่ย?',
        inputPlaceholder: 'เช่น น้องขนมปัง',
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ระบบ',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) {
                return 'กรุณาใส่ชื่อของหนูก่อนนะ!';
            }
        },
        customClass: {
            container: 'swal2-container-custom',
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            input: 'swal2-input-custom',
            confirmButton: 'cute-btn cute-btn-primary swal2-confirm-button-custom',
            cancelButton: 'cute-btn cute-btn-danger swal2-cancel-button-custom'
        },
        buttonsStyling: false
    });
    if (username) {
        currentUser = { username: username, role: 'kid' };
        saveCurrentUser();
        await fetchDataFromGoogleSheet();
    }
});

loginParentBtn.addEventListener('click', async () => {
    playLoginSound();
    const { value: password } = await Swal.fire({
        title: 'รหัสผ่านสำหรับพ่อแม่ 🔐',
        input: 'password',
        inputLabel: 'รหัสผ่าน:',
        inputPlaceholder: 'ใส่รหัสผ่านของคุณ',
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ระบบ',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (value !== 'parent123') {
                return 'รหัสผ่านผิดนะ! ลองใหม่!';
            }
        },
        customClass: {
            container: 'swal2-container-custom',
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            input: 'swal2-input-custom',
            confirmButton: 'cute-btn cute-btn-primary swal2-confirm-button-custom',
            cancelButton: 'cute-btn cute-btn-danger swal2-cancel-button-custom'
        },
        buttonsStyling: false
    });
    if (password === 'parent123') {
        currentUser = { username: 'พ่อแม่สุดเจ๋ง', role: 'parent' };
        saveCurrentUser();
        await fetchDataFromGoogleSheet();
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
    saveCurrentUser();
    await showCustomModal('ออกจากระบบ 👋', 'บ๊ายบาย! ไว้มาใหม่นะหนมปัง-เนยสด! 👋💕', false);
    renderCurrentDashboardAfterDataLoaded();
});

logoutParentBtn.addEventListener('click', async () => {
    playLogoutSound();
    currentUser = null;
    saveCurrentUser();
    await showCustomModal('ออกจากระบบ 😴', 'ไปพักผ่อนได้แล้ว! พ่อแม่สุดเจ๋ง! 💖', false);
    renderCurrentDashboardAfterDataLoaded();
});

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    if (currentUser) {
        fetchDataFromGoogleSheet();
    } else {
        showPage('loginPage');
    }
});