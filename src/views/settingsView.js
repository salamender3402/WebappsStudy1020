/* ==========================================================================
   views/settingsView.js
   - 설정 탭의 관리자 권한 인증 배지, 클라우드 DB 연동 상태 배지, 구글 시트 상태
     배지, PWA/ServiceWorker 상태 표시와 admin-only 요소 동적 토글을 담당하는
     프론트엔드 뷰 모듈
   - 실제 인증/연동 로직은 authService, firebaseService, importExportService에
     위임하고, 이 모듈은 그 결과에 따른 설정 화면 UI 갱신과 버튼 상호작용만 전담한다
   ========================================================================== */

import { state, subscribeState } from '../core/state.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { verifyAdminPasscode, logoutAdmin } from '../services/authService.js';
import { getFirebaseConfig, saveFirebaseConfig, disconnectFirebase, isFirebaseConnected } from '../services/firebaseService.js';
import { getNeisOfficeCode, setNeisOfficeCode, getNeisSchoolCode, setNeisSchoolCode } from '../services/neisService.js';

/**
 * 관리자 권한/DB 상태 변경 시 다른 모듈들에 데이터 재렌더링을 알린다.
 * window 전역 함수 호출을 완전히 제거하고 EventBus를 통해 결합도를 0으로 낮춘다.
 */
function broadcastDataRefresh() {
    eventBus.emit(EVENTS.EVENTS_UPDATED);
    eventBus.emit(EVENTS.CONTACTS_UPDATED);
    eventBus.emit(EVENTS.NOTICES_UPDATED);
}

// ------------------------------------------------------------------
// 1. 관리자 권한 인증 UI 갱신
// ------------------------------------------------------------------

/**
 * state.isAdmin 상태에 따라 관리자 권한 관련 UI 전반을 갱신한다.
 * - #badge-admin-status: '관리자 인증됨' / '인증 필요'
 * - #admin-auth-input-group / #admin-success-box / #btn-logout-admin 토글
 * - 화면 전역 .admin-only 요소 및 하단 내비게이션의 .admin-only-tab(비상연락망) 토글
 * - 관리자 권한을 잃었는데 현재 탭이 비상연락망이면 달력 탭으로 자동 이탈시킨다.
 */
export function updateAdminUI() {
    const adminBadge = document.getElementById('badge-admin-status');
    const adminInputGroup = document.getElementById('admin-auth-input-group');
    const adminSuccessBox = document.getElementById('admin-success-box');
    const logoutBtn = document.getElementById('btn-logout-admin');

    if (state.isAdmin) {
        if (adminBadge) {
            adminBadge.innerText = '관리자 인증됨';
            adminBadge.className = 'badge badge-success';
        }
        if (adminInputGroup) adminInputGroup.classList.add('hidden');
        if (adminSuccessBox) adminSuccessBox.classList.remove('hidden');
        if (logoutBtn) logoutBtn.classList.remove('hidden');

        document.querySelectorAll('.admin-only').forEach((el) => el.classList.remove('hidden'));
        document.querySelectorAll('.admin-only-tab').forEach((el) => el.classList.remove('hidden'));
    } else {
        if (adminBadge) {
            adminBadge.innerText = '인증 필요';
            adminBadge.className = 'badge';
        }
        if (adminInputGroup) adminInputGroup.classList.remove('hidden');
        if (adminSuccessBox) adminSuccessBox.classList.add('hidden');
        if (logoutBtn) logoutBtn.classList.add('hidden');

        document.querySelectorAll('.admin-only').forEach((el) => el.classList.add('hidden'));
        document.querySelectorAll('.admin-only-tab').forEach((el) => el.classList.add('hidden'));

        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.getAttribute('data-tab') === 'tab-contacts') {
            const calendarNav = document.querySelector('.nav-item[data-tab="tab-calendar"]');
            if (calendarNav) calendarNav.click();
        }
    }
}

// ------------------------------------------------------------------
// 2. 클라우드 DB 연동 상태 UI 갱신
// ------------------------------------------------------------------

/**
 * 현재 파이어베이스 실시간 연동 여부에 따라 DB 상태 관련 UI를 갱신한다.
 * - #badge-db-status: '실시간 연동' / '로컬 모드'
 * - #btn-disconnect-firebase 노출 여부
 * - #btn-save-firebase 버튼 문구('연동 정보 갱신' / '클라우드 DB 연동 저장')
 */
export function updateDbStatus() {
    const badgeDb = document.getElementById('badge-db-status');
    const btnDisconnect = document.getElementById('btn-disconnect-firebase');
    const btnSave = document.getElementById('btn-save-firebase');

    const connected = isFirebaseConnected();

    if (badgeDb) {
        badgeDb.innerText = connected ? '실시간 연동' : '로컬 모드';
        badgeDb.className = connected ? 'badge badge-success' : 'badge';
    }
    if (btnDisconnect) btnDisconnect.classList.toggle('hidden', !connected);
    if (btnSave) btnSave.innerText = connected ? '연동 정보 갱신' : '클라우드 DB 연동 저장';
}

// ------------------------------------------------------------------
// 3. 그 외 설정 화면 상태 표시 헬퍼
// ------------------------------------------------------------------

/**
 * 현재 사용 중인(또는 기본값) 파이어베이스 연동 정보를 설정 폼(#fb-project-id,
 * #fb-api-key, #fb-app-id)에 채운다.
 */
function bindFirebaseConfigForm() {
    const config = getFirebaseConfig() || {};
    const fbProjectId = document.getElementById('fb-project-id');
    const fbApiKey = document.getElementById('fb-api-key');
    const fbAppId = document.getElementById('fb-app-id');

    if (fbProjectId) fbProjectId.value = config.projectId || '';
    if (fbApiKey) fbApiKey.value = config.apiKey || '';
    if (fbAppId) fbAppId.value = config.appId || '';
}

/**
 * 나이스 설정 폼(#neis-office-code, #neis-school-code)을 로컬 저장소 값과 양방향 연동한다.
 */
function bindNeisConfigForm() {
    const officeCodeSelect = document.getElementById('neis-office-code');
    const schoolCodeInput = document.getElementById('neis-school-code');

    if (officeCodeSelect) {
        officeCodeSelect.value = getNeisOfficeCode();
        officeCodeSelect.addEventListener('change', () => {
            setNeisOfficeCode(officeCodeSelect.value);
        });
    }

    if (schoolCodeInput) {
        schoolCodeInput.value = getNeisSchoolCode();
        schoolCodeInput.addEventListener('change', () => {
            setNeisSchoolCode(schoolCodeInput.value.trim());
        });
    }
}

/**
 * PWA 설치 상태(#pwa-status)와 ServiceWorker 작동 상태(#sw-status) 표시를 갱신한다.
 * 서비스 워커의 등록 자체는 앱 초기화 시퀀스(main.js)에서 수행하며,
 * 이 함수는 현재 시점의 상태를 조회해 화면에 반영만 한다.
 */
function updatePwaStatusDisplay() {
    const pwaStatus = document.getElementById('pwa-status');
    const swStatus = document.getElementById('sw-status');

    if (pwaStatus) {
        const isStandaloneDisplay = typeof window.matchMedia === 'function'
            && window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandalone = window.navigator && window.navigator.standalone === true;

        pwaStatus.innerText = (isStandaloneDisplay || isIosStandalone)
            ? '앱으로 설치되어 실행 중입니다.'
            : '브라우저 실행 중 (설치 가능)';
    }

    if (swStatus) {
        if ('serviceWorker' in navigator) {
            swStatus.innerText = navigator.serviceWorker.controller
                ? '활성화됨 (오프라인 모드 작동)'
                : '등록 대기 중';
        } else {
            swStatus.innerText = '미지원 브라우저';
        }
    }
}


// ------------------------------------------------------------------
// 4. 버튼 클릭 핸들러
// ------------------------------------------------------------------

/**
 * 관리자 인증 코드 입력(#admin-passcode) 확인 버튼 클릭을 처리한다.
 */
function handleVerifyAdmin() {
    const passInput = document.getElementById('admin-passcode');
    if (!passInput) return;

    const success = verifyAdminPasscode(passInput.value);
    passInput.value = '';

    if (success) {
        alert('관리자 인증에 성공했습니다! 일정/연락망 관리 권한이 부여되었습니다.');
        updateAdminUI();
        broadcastDataRefresh();
    } else {
        alert('인증 코드가 일치하지 않습니다. 다시 입력해 주세요.');
    }
}

/**
 * 관리자 로그아웃 버튼(#btn-logout-admin) 클릭을 처리한다.
 */
function handleLogoutAdmin() {
    if (!confirm('관리자 권한에서 로그아웃하시겠습니까?')) return;

    logoutAdmin();
    alert('일반 교직원 모드로 전환되었습니다. (조회만 가능)');
    updateAdminUI();
    broadcastDataRefresh();
}

/**
 * 파이어베이스 연동 저장 버튼(#btn-save-firebase) 클릭을 처리한다.
 */
async function handleSaveFirebase() {
    const projectId = document.getElementById('fb-project-id')?.value || '';
    const apiKey = document.getElementById('fb-api-key')?.value || '';
    const appId = document.getElementById('fb-app-id')?.value || '';

    const result = await saveFirebaseConfig({ projectId, apiKey, appId });

    if (result.success) {
        alert('클라우드 데이터베이스 설정 정보가 저장되었습니다. 연동을 시작합니다.');
        updateDbStatus();
    } else {
        alert(result.error || '클라우드 연동 저장에 실패했습니다.');
    }
}

/**
 * 파이어베이스 연동 해제 버튼(#btn-disconnect-firebase) 클릭을 처리한다.
 */
async function handleDisconnectFirebase() {
    if (!confirm('클라우드 DB 연동을 해제하고 로컬 모드로 전환하시겠습니까?\n이후 데이터는 개인 스마트폰 브라우저에만 개별 저장됩니다.')) return;

    await disconnectFirebase();
    bindFirebaseConfigForm();
    updateDbStatus();
    alert('연동이 해제되었습니다. 로컬 모드로 작동합니다.');

    broadcastDataRefresh();
}

// ------------------------------------------------------------------
// 5. 초기화
// ------------------------------------------------------------------

/**
 * 설정 화면을 초기화한다.
 * - 파이어베이스 연동 정보 폼(#fb-project-id, #fb-api-key, #fb-app-id) 바인딩
 * - PWA 설치 상태(#pwa-status) 및 ServiceWorker 작동 상태(#sw-status) 갱신
 * - 관리자 인증/로그아웃, 파이어베이스 저장/해제 버튼 바인딩
 * - state.isAdmin / state.dbMode / state.db가 외부에서 바뀔 때 관련 UI를 자동 갱신
 */
export function initSettingsView() {
    bindFirebaseConfigForm();
    bindNeisConfigForm();
    updatePwaStatusDisplay();
    updateAdminUI();
    updateDbStatus();

    const btnVerifyAdmin = document.getElementById('btn-verify-admin');
    if (btnVerifyAdmin) btnVerifyAdmin.addEventListener('click', handleVerifyAdmin);

    const btnLogoutAdmin = document.getElementById('btn-logout-admin');
    if (btnLogoutAdmin) btnLogoutAdmin.addEventListener('click', handleLogoutAdmin);

    const btnSaveFirebase = document.getElementById('btn-save-firebase');
    if (btnSaveFirebase) btnSaveFirebase.addEventListener('click', handleSaveFirebase);

    const btnDisconnectFirebase = document.getElementById('btn-disconnect-firebase');
    if (btnDisconnectFirebase) btnDisconnectFirebase.addEventListener('click', handleDisconnectFirebase);

    subscribeState((key) => {
        if (key === 'isAdmin') updateAdminUI();
        if (key === 'dbMode' || key === 'db') updateDbStatus();
    });
}
