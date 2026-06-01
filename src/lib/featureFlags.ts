/**
 * Feature flags
 *
 * ENABLE_X30: AI 응답 점유율(×30 동시 측정) + AI 인지 카드(직접 물어보기) 전체 스위치.
 * 토큰 비용 과다 소진으로 일시 OFF. 블루프린트(.lovable/blueprint/x30-ai-perception.md)에만 보존.
 * 다시 켤 때:
 *  1) 이 값을 true 로 변경
 *  2) PERPLEXITY_API_KEY / LOVABLE_API_KEY 잔여 크레딧 확인
 *  3) probe-ai-perception, measure-answer-share 함수 부분실패 허용 패치 검토
 */
export const ENABLE_X30 = false;
