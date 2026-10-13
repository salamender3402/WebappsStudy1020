/* ==========================================================================
   core/eventBus.js
   - 모듈 간의 직접 결합(tight coupling)과 window 전역 객체 오염을 100% 제거하는
     순수 발행-구독(Publish-Subscribe) 기반 경량 이벤트 버스
   - 어떤 모듈이 먼저 로드되거나 에러로 인해 등록되지 않더라도,
     다른 모듈의 함수 호출이 실패하거나 앱 전체가 중단되지 않도록 보호한다.
   ========================================================================== */

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * 특정 이벤트에 리스너 등록
     * @param {string} event - 이벤트명
     * @param {Function} callback - 실행할 콜백 함수
     * @returns {Function} 구독 해제(unsubscribe) 함수
     */
    on(event, callback) {
        if (typeof callback !== 'function') return () => {};
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const set = this.listeners.get(event);
        set.add(callback);

        return () => this.off(event, callback);
    }

    /**
     * 특정 이벤트의 리스너 등록 해제
     * @param {string} event - 이벤트명
     * @param {Function} callback - 해제할 콜백 함수
     */
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const set = this.listeners.get(event);
        set.delete(callback);
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * 이벤트를 발행하여 등록된 모든 리스너를 실행 (오류 방화벽 내장)
     * 하나의 리스너에서 예외가 발생하더라도 다른 리스너 실행을 절대 방해하지 않는다.
     * @param {string} event - 이벤트명
     * @param {*} payload - 전달할 데이터
     */
    emit(event, payload) {
        if (!this.listeners.has(event)) return;
        const set = this.listeners.get(event);

        set.forEach((callback) => {
            try {
                callback(payload);
            } catch (err) {
                console.error(`[EventBus Error] 이벤트 '${event}' 처리 중 콜백 예외 발생:`, err);
            }
        });
    }

    /**
     * 특정 이벤트에 대해 1회만 실행되는 리스너 등록
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            callback(payload);
        });
        return unsubscribe;
    }

    /**
     * 모든 리스너 초기화 (테스트 및 리셋용)
     */
    clear() {
        this.listeners.clear();
    }
}

// 싱글톤 인스턴스 내보내기
export const eventBus = new EventBus();

// 표준 이벤트 상수 정의 (오타 방지)
export const EVENTS = {
    // 상태 및 권한
    AUTH_STATE_CHANGED: 'auth:state_changed',       // { isStaffAuthenticated, isAdmin }
    ADMIN_LOGGED_IN: 'admin:logged_in',
    ADMIN_LOGGED_OUT: 'admin:logged_out',
    DB_STATUS_CHANGED: 'db:status_changed',         // { dbMode, connected }

    // 데이터 갱신
    EVENTS_UPDATED: 'data:events_updated',           // events 목록 갱신
    CONTACTS_UPDATED: 'data:contacts_updated',       // contacts 목록 갱신
    NOTICES_UPDATED: 'data:notices_updated',         // notices 목록 갱신
    NOTICE_BANNER_UPDATED: 'data:notice_banner_updated',
    MEALS_UPDATED: 'data:meals_updated',

    // 탭 및 화면 전환
    TAB_CHANGED: 'nav:tab_changed',                 // { tabId }

    // 모달 요청 (window 전역 함수 호출을 대체)
    MODAL_OPEN: 'modal:open',                       // { modalId, data }
    MODAL_CLOSE: 'modal:close',                     // { modalId }
    SHOW_EVENT_DETAIL: 'modal:show_event_detail',   // eventObj
    SHOW_ADD_EVENT: 'modal:show_add_event',         // selectedDate
    SHOW_EDIT_EVENT: 'modal:show_edit_event',       // eventObj
    SHOW_ADD_CONTACT: 'modal:show_add_contact',
    SHOW_EDIT_CONTACT: 'modal:show_edit_contact',   // contactId
    SHOW_ADD_NOTICE: 'modal:show_add_notice',
    SHOW_EDIT_NOTICE: 'modal:show_edit_notice'      // noticeObj
};
