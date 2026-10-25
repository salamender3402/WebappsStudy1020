/* ==========================================================================
   core/state.js
   - 앱 전역에서 공유되는 상수와 싱글톤 반응형 상태(state) 저장소
   - 방어적 기본값(Defensive Fallback)과 Proxy를 통해
     어떤 필드가 비어있거나 손상되어도 하위 뷰에서 TypeError로 폭사하지 않도록 보호한다.
   ========================================================================== */

import { eventBus, EVENTS } from './eventBus.js';

// ------------------------------------------------------------------
// 1. 나이스(NEIS) 공식 API 설정 (기본값: 비워둠 -> 연수 시 본인 학교 정보로 연동)
// ------------------------------------------------------------------
export const NEIS_API_KEY = '';
export const NEIS_DEFAULT_SCHOOL = ''; // 행정표준기관코드 8자리
export const NEIS_DEFAULT_OFFICE = 'J10'; // 시도교육청코드 (기본: 경기도교육청 J10)

// ------------------------------------------------------------------
// 2. 보안 인증 코드 (연수 실습용 기본 비밀번호: 1234)
// ------------------------------------------------------------------
export const ADMIN_PASSCODE = '1234';   // 관리자 비밀번호
export const STAFF_PASSCODE = '1234';   // 교직원 보안 인증 코드
export const CONTACT_PIN_CODE = '1234'; // 비상연락망 2차 PIN 번호

// ------------------------------------------------------------------
// 3. 파이어베이스 연동 정보 (기본값: null -> 안전한 로컬 모드로 시작)
// ------------------------------------------------------------------
export const DEFAULT_FIREBASE_CONFIG = null;

// ------------------------------------------------------------------
// 4. 초기 모의 데이터 (Mock Data) - 시범 배포를 위해 비워둠
// ------------------------------------------------------------------
export const MOCK_EVENTS = [];
export const MOCK_CONTACTS = [];

/**
 * state 초기값을 생성하는 팩토리 함수.
 * 배열/객체는 빈 컬렉션 기본값을 보장하여 downstream에서 .filter, .map 등이 안전하게 동작한다.
 */
function createInitialState() {
    return {
        currentDate: new Date(),
        selectedDate: new Date(),
        mealSelectedDate: new Date(),
        activeTab: 'tab-calendar',
        filterCategory: 'all',
        events: [],
        contacts: [],
        meals: {},
        isStaffAuthenticated: false,
        isContactsAuthenticated: false,
        isAdmin: false,
        isSyncing: false,
        dbMode: 'local',
        firebaseConfig: null,
        deferredPrompt: null,
        notice: { text: '', active: true },
        notices: [],
        firebaseApp: null,
        db: null,
        unsubscribeEvents: null,
        unsubscribeContacts: null
    };
}

// state 변경을 감지하는 구독자(listener) 목록
const listeners = new Set();

/**
 * 등록된 모든 구독자에게 상태 변경을 알린다.
 * 개별 리스너에서 에러가 터져도 다른 리스너로 전파되지 않도록 방화벽 적용.
 */
function notify(key, value) {
    listeners.forEach((listener) => {
        try {
            listener(key, value, state);
        } catch (e) {
            console.error(`[State Listener Error] key=${key} 처리 중 예외 발생:`, e);
        }
    });

    // EventBus와도 자동 동기화 (모듈 간 결합 완화)
    if (key === 'events') eventBus.emit(EVENTS.EVENTS_UPDATED, value);
    if (key === 'contacts') eventBus.emit(EVENTS.CONTACTS_UPDATED, value);
    if (key === 'notices') eventBus.emit(EVENTS.NOTICES_UPDATED, value);
    if (key === 'notice') eventBus.emit(EVENTS.NOTICE_BANNER_UPDATED, value);
    if (key === 'meals') eventBus.emit(EVENTS.MEALS_UPDATED, value);
    if (key === 'isAdmin' || key === 'isStaffAuthenticated') {
        eventBus.emit(EVENTS.AUTH_STATE_CHANGED, {
            isStaffAuthenticated: state.isStaffAuthenticated,
            isAdmin: state.isAdmin
        });
    }
}

/**
 * 전역 싱글톤 반응형 상태 객체.
 * Get/Set 트랩을 통해 Null 안전성과 이벤트 통지를 보장한다.
 */
export const state = new Proxy(createInitialState(), {
    get(target, key) {
        // 배열 필드가 null/undefined로 오염되는 것을 원천 차단
        if (key === 'events' && !Array.isArray(target[key])) return [];
        if (key === 'contacts' && !Array.isArray(target[key])) return [];
        if (key === 'notices' && !Array.isArray(target[key])) return [];
        if (key === 'meals' && (!target[key] || typeof target[key] !== 'object')) return {};
        if (key === 'notice' && (!target[key] || typeof target[key] !== 'object')) return { text: '', active: false };

        return target[key];
    },
    set(target, key, value) {
        target[key] = value;
        notify(key, value);
        return true;
    }
});

/**
 * state 변경을 구독한다.
 */
export function subscribeState(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * 여러 state 필드를 한 번에 갱신한다.
 */
export function updateState(patch) {
    if (!patch || typeof patch !== 'object') return;
    Object.entries(patch).forEach(([key, value]) => {
        state[key] = value;
    });
}

/**
 * state를 초기 상태로 되돌린다.
 */
export function resetState() {
    updateState(createInitialState());
}
